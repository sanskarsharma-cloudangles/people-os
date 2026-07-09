from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Employee, OnboardingTask, OnboardingRun
from app.deps import get_current_user, require_role
from app.helpers import now, notify, audit

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


@router.get("/mine")
def get_my_onboarding_tasks(
    user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get onboarding tasks assigned to current user."""
    tasks = db.query(OnboardingTask).filter_by(owner_id=user.id).all()
    
    result = []
    for task in tasks:
        run = db.get(OnboardingRun, task.run_id)
        employee = db.get(Employee, run.employee_id)
        
        result.append({
            "id": task.id,
            "run_id": task.run_id,
            "title": task.title,
            "status": task.status,
            "step_index": task.step_index,
            "employee_id": employee.id,
            "employee_name": employee.name,
            "completed_at": task.completed_at,
        })
    
    return result


@router.post("/tasks/{id}/complete")
def complete_task(
    id: int,
    user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark onboarding task complete (owner only)."""
    task = db.get(OnboardingTask, id)
    if not task:
        raise HTTPException(404, "Task not found")
    
    # Check ownership
    if task.owner_id != user.id:
        raise HTTPException(403, "Not the owner of this task")
    
    # Mark as done
    task.status = "done"
    task.completed_at = now()
    
    # Check if this unblocks any dependent tasks
    run = db.get(OnboardingRun, task.run_id)
    all_tasks = db.query(OnboardingTask).filter_by(run_id=run.id).all()
    
    for other_task in all_tasks:
        if other_task.depends_on == task.step_index and other_task.status == "blocked":
            other_task.status = "pending"
            
            # Notify the new owner
            if other_task.owner_id:
                owner = db.get(Employee, other_task.owner_id)
                if owner:
                    notify(
                        db,
                        owner.id,
                        "onboarding_task",
                        f"Onboarding task now available: {other_task.title}",
                        link=f"/onboarding/{run.id}"
                    )
    
    # Check if all tasks are done
    all_done = all(t.status == "done" for t in all_tasks)
    if all_done:
        run.status = "completed"
        run.completed_at = now()
        
        # Notify the employee
        employee = db.get(Employee, run.employee_id)
        if employee:
            notify(
                db,
                employee.id,
                "onboarding_complete",
                "Your onboarding is complete!",
                link=f"/dashboard"
            )
    
    audit(db, user.id, "complete_task", "onboarding_task", id, {})
    
    db.commit()
    
    return {"status": "done", "id": id}


@router.get("/pipeline")
def get_onboarding_pipeline(
    user: Employee = Depends(require_role("hr_admin")),
    db: Session = Depends(get_db),
):
    """Get all onboarding runs (hr_admin only)."""
    runs = db.query(OnboardingRun).all()
    
    result = []
    for run in runs:
        employee = db.get(Employee, run.employee_id)
        tasks = db.query(OnboardingTask).filter_by(run_id=run.id).all()
        
        task_list = [
            {
                "id": t.id,
                "title": t.title,
                "status": t.status,
                "owner_id": t.owner_id,
                "owner_name": db.get(Employee, t.owner_id).name if t.owner_id else None,
            }
            for t in tasks
        ]
        
        result.append({
            "id": run.id,
            "employee_id": employee.id,
            "employee_name": employee.name,
            "status": run.status,
            "started_at": run.started_at,
            "completed_at": run.completed_at,
            "tasks": task_list,
        })
    
    return result
