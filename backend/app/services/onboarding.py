import json
from sqlalchemy.orm import Session
from datetime import datetime

from app.models import (
    OnboardingTemplate,
    OnboardingRun,
    OnboardingTask,
    Employee,
)
from app.helpers import now, notify


def instantiate(db: Session, employee: Employee):
    """
    Create an onboarding run for a new employee.
    - Pick template by employee role
    - Create run + tasks
    - Resolve owner by owner_role
    - Set status to blocked if depends_on is not done
    - Notify owners
    """
    # Pick template for this employee's role
    template = db.query(OnboardingTemplate).filter_by(
        role_target=employee.role
    ).first()
    
    if not template:
        # Default to first template if no match
        template = db.query(OnboardingTemplate).first()
    
    if not template:
        raise ValueError("No onboarding template available")
    
    # Parse steps from template
    try:
        steps = json.loads(template.steps)
    except:
        steps = []
    
    # Create onboarding run
    run = OnboardingRun(
        employee_id=employee.id,
        template_id=template.id,
        started_at=now(),
        status="in_progress",
    )
    db.add(run)
    db.flush()  # Get the run ID
    
    # Create tasks from steps
    for idx, step in enumerate(steps):
        # Resolve owner by owner_role
        owner_role = step.get("owner_role")
        owner_id = None
        
        if owner_role == "employee":
            # The employee being onboarded
            owner_id = employee.id
        elif owner_role == "manager":
            # The employee's manager
            if employee.manager_id:
                owner_id = employee.manager_id
        elif owner_role == "hr_admin":
            # Find an HR admin (for now, take the first one)
            hr_admin = db.query(Employee).filter_by(role="hr_admin").first()
            if hr_admin:
                owner_id = hr_admin.id
        
        # Determine task status based on dependencies
        task_status = "pending"
        depends_on = step.get("depends_on")
        
        if depends_on is not None and depends_on >= 0:
            # Check if the dependency is done
            # depends_on is the step_index, so we need to check previous tasks
            if idx > 0:  # Only if there are previous tasks
                # We'll set to blocked initially; will check in a second pass
                task_status = "blocked"
        
        task = OnboardingTask(
            run_id=run.id,
            step_index=idx,
            title=step.get("title", ""),
            owner_id=owner_id,
            depends_on=depends_on,
            status=task_status,
        )
        db.add(task)
    
    db.flush()
    
    # Second pass: update blocked status based on actual dependencies
    tasks = db.query(OnboardingTask).filter_by(run_id=run.id).all()
    
    for task in tasks:
        if task.depends_on is not None and task.depends_on >= 0:
            # Find the dependency task
            dep_task = None
            for t in tasks:
                if t.step_index == task.depends_on:
                    dep_task = t
                    break
            
            # If dependency is not done, mark as blocked
            if dep_task and dep_task.status != "done":
                task.status = "blocked"
            else:
                task.status = "pending"
        elif task.status == "blocked":
            # No dependency but was marked blocked, reset to pending
            task.status = "pending"
    
    # Notify owners of their tasks
    for task in tasks:
        if task.owner_id:
            owner = db.get(Employee, task.owner_id)
            if owner:
                notify(
                    db,
                    owner.id,
                    "onboarding_task",
                    f"Onboarding task assigned: {task.title}",
                    body=f"You have a new onboarding task for {employee.name}",
                    link=f"/onboarding/{run.id}"
                )
    
    db.commit()
    return run
