from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, date

from app.db import get_db
from app.models import Employee, LeaveBalance, LeaveRequest, OnboardingRun, Expense
from app.deps import get_current_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def get_view(user: Employee) -> str:
    """Determine the view based on user role and tenure."""
    if user.role == "hr_admin":
        return "hr_admin"
    elif user.role == "manager":
        return "manager"
    
    # For employees: check if new_hire (join_date < 30 days ago)
    join_date = datetime.fromisoformat(user.join_date).date()
    today = date.today()
    days_since_join = (today - join_date).days
    
    if days_since_join < 30:
        return "new_hire"
    return "employee"


@router.get("/")
def get_dashboard(
    user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return contextual dashboard for current user."""
    view = get_view(user)
    
    # Base response
    response = {"view": view}
    
    if view == "new_hire":
        # New hire sees their onboarding progress
        run = db.query(OnboardingRun).filter_by(
            employee_id=user.id,
            status="in_progress"
        ).first()
        
        if run:
            tasks = db.query(OnboardingRun.__table__.join(
                OnboardingRun.__table__.c.id,
                db.query(OnboardingRun).filter_by(id=run.id).first().__table__.c.id
            )).all() if run else []
            
            # Simpler approach: get tasks from the run
            from app.models import OnboardingTask
            tasks = db.query(OnboardingTask).filter_by(run_id=run.id).all()
            task_list = [
                {
                    "id": t.id,
                    "title": t.title,
                    "status": t.status,
                    "owner_id": t.owner_id,
                }
                for t in tasks
            ]
            response["onboarding"] = {
                "run_id": run.id,
                "status": run.status,
                "tasks": task_list,
            }
        
        # Also show leave balance
        balances = db.query(LeaveBalance).filter_by(employee_id=user.id).all()
        response["leave_balances"] = [
            {
                "leave_type": b.leave_type,
                "total_days": b.total_days,
                "used_days": b.used_days,
                "pending_days": b.pending_days,
                "available": b.total_days - b.used_days - b.pending_days,
            }
            for b in balances
        ]
    
    elif view == "employee":
        # Regular employee sees leave balance and pending requests
        balances = db.query(LeaveBalance).filter_by(employee_id=user.id).all()
        response["leave_balances"] = [
            {
                "leave_type": b.leave_type,
                "total_days": b.total_days,
                "used_days": b.used_days,
                "pending_days": b.pending_days,
                "available": b.total_days - b.used_days - b.pending_days,
            }
            for b in balances
        ]
        
        # Show pending leave requests
        pending = db.query(LeaveRequest).filter_by(
            employee_id=user.id,
            status="pending"
        ).all()
        response["pending_leaves"] = [
            {
                "id": lr.id,
                "leave_type": lr.leave_type,
                "start_date": lr.start_date,
                "end_date": lr.end_date,
                "days": lr.days,
                "status": lr.status,
            }
            for lr in pending
        ]
    
    elif view == "manager":
        # Manager sees their team's pending leave requests
        reports = db.query(Employee).filter_by(manager_id=user.id).all()
        report_ids = [r.id for r in reports]
        
        pending_requests = db.query(LeaveRequest).filter(
            LeaveRequest.employee_id.in_(report_ids),
            LeaveRequest.status == "pending"
        ).all() if report_ids else []
        
        response["pending_approvals"] = [
            {
                "id": lr.id,
                "employee_id": lr.employee_id,
                "employee_name": db.get(Employee, lr.employee_id).name,
                "leave_type": lr.leave_type,
                "start_date": lr.start_date,
                "end_date": lr.end_date,
                "days": lr.days,
                "applied_at": lr.applied_at,
            }
            for lr in pending_requests
        ]
        
        # Show pending expenses in queue
        pending_expenses = db.query(Expense).filter(
            Expense.employee_id.in_(report_ids),
            Expense.status == "with_manager"
        ).all() if report_ids else []
        
        response["pending_expenses"] = [
            {
                "id": e.id,
                "employee_id": e.employee_id,
                "amount": e.amount,
                "category": e.category,
                "status": e.status,
                "submitted_at": e.submitted_at,
            }
            for e in pending_expenses
        ]
    
    elif view == "hr_admin":
        # HR Admin sees high-level metrics
        total_employees = db.query(Employee).count()
        new_hires = db.query(Employee).filter(
            Employee.role == "employee"
        ).all()
        
        # Count new hires (< 30 days)
        today = date.today()
        new_hire_count = 0
        for emp in new_hires:
            join_date = datetime.fromisoformat(emp.join_date).date()
            if (today - join_date).days < 30:
                new_hire_count += 1
        
        # Pending onboarding runs
        pending_runs = db.query(OnboardingRun).filter_by(
            status="in_progress"
        ).count()
        
        # Pending expense approvals in finance queue
        pending_exp = db.query(Expense).filter_by(
            status="with_finance"
        ).count()
        
        response["metrics"] = {
            "total_employees": total_employees,
            "new_hires_30_days": new_hire_count,
            "onboarding_in_progress": pending_runs,
            "pending_expense_approvals": pending_exp,
        }
    
    return response
