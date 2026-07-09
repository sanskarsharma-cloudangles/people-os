from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime, date

from app.db import get_db
from app.models import Employee, LeaveRequest, LeaveBalance
from app.deps import get_current_user, require_role
from app.helpers import now, notify, audit

router = APIRouter(prefix="/leave", tags=["leave"])


class LeaveRequestIn(BaseModel):
    leave_type: str
    start_date: str
    end_date: str
    days: float
    note: str = None


@router.post("/")
def apply_leave(
    body: LeaveRequestIn,
    user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Apply for leave. Deducts balance as pending."""
    # Check leave balance
    balance = db.query(LeaveBalance).filter_by(
        employee_id=user.id,
        leave_type=body.leave_type
    ).first()
    
    if not balance:
        raise HTTPException(400, f"No {body.leave_type} leave balance found")
    
    available = balance.total_days - balance.used_days - balance.pending_days
    if body.days > available:
        raise HTTPException(400, f"Insufficient balance. Available: {available} days")
    
    # Create leave request with pending status
    leave_req = LeaveRequest(
        employee_id=user.id,
        leave_type=body.leave_type,
        start_date=body.start_date,
        end_date=body.end_date,
        days=body.days,
        status="pending",
        applied_at=now(),
        note=body.note,
    )
    db.add(leave_req)
    db.flush()
    
    # Deduct as pending
    balance.pending_days += body.days
    
    # Notify manager
    if user.manager_id:
        manager = db.get(Employee, user.manager_id)
        if manager:
            notify(
                db,
                manager.id,
                "leave_request",
                f"{user.name} requested {body.days} days of {body.leave_type}",
                link=f"/leave/{leave_req.id}"
            )
    
    audit(db, user.id, "apply_leave", "leave_request", leave_req.id, 
          {"leave_type": body.leave_type, "days": body.days})
    
    db.commit()
    
    return {
        "id": leave_req.id,
        "status": "pending",
        "message": f"Leave applied. Pending approval from your manager."
    }


@router.post("/{id}/approve")
def approve_leave(
    id: int,
    user: Employee = Depends(require_role("manager", "hr_admin")),
    db: Session = Depends(get_db),
):
    """Approve leave request (manager/hr_admin only, must be approver)."""
    leave_req = db.get(LeaveRequest, id)
    if not leave_req:
        raise HTTPException(404, "Leave request not found")
    
    if leave_req.status != "pending":
        raise HTTPException(400, f"Cannot approve {leave_req.status} request")
    
    # Check authorization: user must be the employee's manager or hr_admin
    employee = db.get(Employee, leave_req.employee_id)
    if user.role == "manager" and employee.manager_id != user.id:
        raise HTTPException(403, "Not the approver for this leave")
    
    # Approve
    leave_req.status = "approved"
    leave_req.approver_id = user.id
    leave_req.resolved_at = now()
    
    # No need to adjust balance: it's already marked as pending
    
    # Notify employee
    notify(
        db,
        employee.id,
        "leave_approved",
        f"Your leave request for {leave_req.days} days was approved",
        link=f"/leave/{leave_req.id}"
    )
    
    audit(db, user.id, "approve_leave", "leave_request", id, {})
    
    db.commit()
    
    return {"status": "approved", "id": id}


@router.post("/{id}/reject")
def reject_leave(
    id: int,
    user: Employee = Depends(require_role("manager", "hr_admin")),
    db: Session = Depends(get_db),
):
    """Reject leave request (manager/hr_admin only, must be approver)."""
    leave_req = db.get(LeaveRequest, id)
    if not leave_req:
        raise HTTPException(404, "Leave request not found")
    
    if leave_req.status != "pending":
        raise HTTPException(400, f"Cannot reject {leave_req.status} request")
    
    # Check authorization: user must be the employee's manager or hr_admin
    employee = db.get(Employee, leave_req.employee_id)
    if user.role == "manager" and employee.manager_id != user.id:
        raise HTTPException(403, "Not the approver for this leave")
    
    # Reject and release pending balance
    leave_req.status = "rejected"
    leave_req.approver_id = user.id
    leave_req.resolved_at = now()
    
    # Release the pending days
    balance = db.query(LeaveBalance).filter_by(
        employee_id=employee.id,
        leave_type=leave_req.leave_type
    ).first()
    if balance:
        balance.pending_days -= leave_req.days
    
    # Notify employee
    notify(
        db,
        employee.id,
        "leave_rejected",
        f"Your leave request for {leave_req.days} days was rejected",
        link=f"/leave/{leave_req.id}"
    )
    
    audit(db, user.id, "reject_leave", "leave_request", id, {})
    
    db.commit()
    
    return {"status": "rejected", "id": id}


@router.get("/mine")
def get_my_leaves(
    user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get current user's leave requests."""
    requests = db.query(LeaveRequest).filter_by(employee_id=user.id).all()
    
    return [
        {
            "id": lr.id,
            "leave_type": lr.leave_type,
            "start_date": lr.start_date,
            "end_date": lr.end_date,
            "days": lr.days,
            "status": lr.status,
            "applied_at": lr.applied_at,
            "resolved_at": lr.resolved_at,
            "note": lr.note,
        }
        for lr in requests
    ]


@router.get("/team")
def get_team_leave_calendar(
    user: Employee = Depends(require_role("manager", "hr_admin")),
    db: Session = Depends(get_db),
):
    """Get team calendar (manager's reports approved leaves)."""
    if user.role == "manager":
        # Get only manager's direct reports
        reports = db.query(Employee).filter_by(manager_id=user.id).all()
    else:  # hr_admin
        # Get all employees
        reports = db.query(Employee).filter(Employee.role == "employee").all()
    
    report_ids = [r.id for r in reports]
    
    if not report_ids:
        return []
    
    approved_leaves = db.query(LeaveRequest).filter(
        LeaveRequest.employee_id.in_(report_ids),
        LeaveRequest.status == "approved"
    ).all()
    
    return [
        {
            "id": lr.id,
            "employee_id": lr.employee_id,
            "employee_name": db.get(Employee, lr.employee_id).name,
            "leave_type": lr.leave_type,
            "start_date": lr.start_date,
            "end_date": lr.end_date,
            "days": lr.days,
            "status": lr.status,
        }
        for lr in approved_leaves
    ]
