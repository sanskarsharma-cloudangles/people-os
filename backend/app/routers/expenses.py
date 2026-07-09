from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session
import os
import uuid
from pathlib import Path

from app.db import get_db
from app.models import Employee, Expense
from app.deps import get_current_user, require_role
from app.helpers import now, notify, audit

router = APIRouter(prefix="/expenses", tags=["expenses"])

UPLOADS_DIR = Path(__file__).parent.parent.parent / "uploads"


def get_approver_status(amount: float) -> tuple:
    """
    Determine the approval chain based on amount.
    Returns: (status, required_approver_role)
    - < 5000: with_manager (manager approves)
    - >= 5000: with_finance (finance/hr_admin approves)
    """
    if amount < 5000:
        return ("with_manager", "manager")
    else:
        return ("with_finance", "hr_admin")


@router.post("/")
async def submit_expense(
    amount: float = Form(...),
    category: str = Form(...),
    description: str = Form(None),
    receipt: UploadFile = File(...),
    user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit expense with receipt. Sets status based on amount chain."""
    # Save receipt file
    try:
        contents = await receipt.file.read()
        file_id = str(uuid.uuid4())
        file_ext = Path(receipt.filename).suffix or ".pdf"
        file_path = UPLOADS_DIR / f"{file_id}{file_ext}"
        
        with open(file_path, "wb") as f:
            f.write(contents)
        
        receipt_url = f"/uploads/{file_id}{file_ext}"
    except Exception as e:
        raise HTTPException(500, f"Failed to save receipt: {str(e)}")
    
    # Determine initial status based on amount
    initial_status, _ = get_approver_status(amount)
    
    # Create expense
    expense = Expense(
        employee_id=user.id,
        amount=amount,
        category=category,
        description=description,
        receipt_url=receipt_url,
        status=initial_status,
        submitted_at=now(),
    )
    db.add(expense)
    db.flush()
    
    # Notify the approver
    if initial_status == "with_manager" and user.manager_id:
        manager = db.get(Employee, user.manager_id)
        if manager:
            notify(
                db,
                manager.id,
                "expense_submitted",
                f"Expense of ${amount} submitted for approval",
                link=f"/expenses/{expense.id}"
            )
    elif initial_status == "with_finance":
        # Notify first HR admin
        hr_admin = db.query(Employee).filter_by(role="hr_admin").first()
        if hr_admin:
            notify(
                db,
                hr_admin.id,
                "expense_submitted",
                f"Expense of ${amount} submitted for approval",
                link=f"/expenses/{expense.id}"
            )
    
    audit(db, user.id, "submit_expense", "expense", expense.id,
          {"amount": amount, "category": category})
    
    db.commit()
    
    return {
        "id": expense.id,
        "status": initial_status,
        "receipt_url": receipt_url,
        "message": "Expense submitted successfully"
    }


@router.post("/{id}/approve")
def approve_expense(
    id: int,
    user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Approve expense (ownership + RBAC checked)."""
    expense = db.get(Expense, id)
    if not expense:
        raise HTTPException(404, "Expense not found")
    
    # Check if approver is authorized for this status
    if expense.status == "with_manager":
        # Only the employee's manager can approve
        employee = db.get(Employee, expense.employee_id)
        if employee.manager_id != user.id:
            raise HTTPException(403, "Not authorized to approve this expense")
        
        # Move to next stage (to finance if >= 5000) or approved
        if expense.amount >= 5000:
            expense.status = "with_finance"
            # Notify finance
            hr_admin = db.query(Employee).filter_by(role="hr_admin").first()
            if hr_admin:
                notify(
                    db,
                    hr_admin.id,
                    "expense_submitted",
                    f"Expense of ${expense.amount} ready for finance review",
                    link=f"/expenses/{expense.id}"
                )
        else:
            expense.status = "approved"
            expense.approver_id = user.id
            expense.resolved_at = now()
            # Notify employee
            employee = db.get(Employee, expense.employee_id)
            if employee:
                notify(
                    db,
                    employee.id,
                    "expense_approved",
                    f"Your expense of ${expense.amount} was approved",
                    link=f"/expenses/{expense.id}"
                )
    
    elif expense.status == "with_finance":
        # Only HR admin can approve finance expenses
        if user.role != "hr_admin":
            raise HTTPException(403, "Only HR admin can approve finance expenses")
        
        expense.status = "approved"
        expense.approver_id = user.id
        expense.resolved_at = now()
        
        # Notify employee
        employee = db.get(Employee, expense.employee_id)
        if employee:
            notify(
                db,
                employee.id,
                "expense_approved",
                f"Your expense of ${expense.amount} was approved",
                link=f"/expenses/{expense.id}"
            )
    
    else:
        raise HTTPException(400, f"Cannot approve {expense.status} expense")
    
    audit(db, user.id, "approve_expense", "expense", id, {})
    
    db.commit()
    
    return {"status": expense.status, "id": id}


@router.post("/{id}/reject")
def reject_expense(
    id: int,
    reason: str = None,
    user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Reject expense (ownership + RBAC checked)."""
    expense = db.get(Expense, id)
    if not expense:
        raise HTTPException(404, "Expense not found")
    
    # Check if rejector is authorized
    if expense.status == "with_manager":
        employee = db.get(Employee, expense.employee_id)
        if employee.manager_id != user.id:
            raise HTTPException(403, "Not authorized to reject this expense")
    elif expense.status == "with_finance":
        if user.role != "hr_admin":
            raise HTTPException(403, "Only HR admin can reject finance expenses")
    else:
        raise HTTPException(400, f"Cannot reject {expense.status} expense")
    
    # Reject
    expense.status = "rejected"
    expense.approver_id = user.id
    expense.resolved_at = now()
    
    # Notify employee
    employee = db.get(Employee, expense.employee_id)
    if employee:
        msg = f"Your expense of ${expense.amount} was rejected"
        if reason:
            msg += f": {reason}"
        notify(
            db,
            employee.id,
            "expense_rejected",
            msg,
            link=f"/expenses/{expense.id}"
        )
    
    audit(db, user.id, "reject_expense", "expense", id, {"reason": reason})
    
    db.commit()
    
    return {"status": "rejected", "id": id}


@router.get("/mine")
def get_my_expenses(
    user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get current user's expenses."""
    expenses = db.query(Expense).filter_by(employee_id=user.id).all()
    
    return [
        {
            "id": e.id,
            "amount": e.amount,
            "category": e.category,
            "description": e.description,
            "receipt_url": e.receipt_url,
            "status": e.status,
            "submitted_at": e.submitted_at,
            "resolved_at": e.resolved_at,
        }
        for e in expenses
    ]


@router.get("/queue")
def get_approval_queue(
    user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get expenses in user's approval queue."""
    expenses = []
    
    if user.role == "manager":
        # Get expenses from manager's reports in "with_manager" status
        reports = db.query(Employee).filter_by(manager_id=user.id).all()
        report_ids = [r.id for r in reports]
        
        if report_ids:
            expenses = db.query(Expense).filter(
                Expense.employee_id.in_(report_ids),
                Expense.status == "with_manager"
            ).all()
    
    elif user.role == "hr_admin":
        # Get all expenses in "with_finance" status
        expenses = db.query(Expense).filter_by(status="with_finance").all()
    
    else:
        raise HTTPException(403, "Not an approver")
    
    return [
        {
            "id": e.id,
            "employee_id": e.employee_id,
            "employee_name": db.get(Employee, e.employee_id).name,
            "amount": e.amount,
            "category": e.category,
            "description": e.description,
            "receipt_url": e.receipt_url,
            "status": e.status,
            "submitted_at": e.submitted_at,
        }
        for e in expenses
    ]


@router.get("/{id}/receipt")
def get_receipt(
    id: int,
    user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Download receipt (ownership-checked). Writes audit log."""
    expense = db.get(Expense, id)
    if not expense:
        raise HTTPException(404, "Expense not found")
    
    # Check ownership: only the employee, their manager, or an HR admin can access
    is_owner = (expense.employee_id == user.id)
    is_manager = (user.role == "manager" and 
                  db.get(Employee, expense.employee_id).manager_id == user.id)
    is_hr = (user.role == "hr_admin")
    
    if not (is_owner or is_manager or is_hr):
        raise HTTPException(403, "Not authorized to view this receipt")
    
    # Log access
    audit(db, user.id, "view_receipt", "expense", id, {})
    db.commit()
    
    # Return file path/URL
    if expense.receipt_url:
        return {
            "receipt_url": expense.receipt_url,
            "message": "Receipt downloaded"
        }
    else:
        raise HTTPException(404, "No receipt found")
