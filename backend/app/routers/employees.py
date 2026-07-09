from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from passlib.hash import pbkdf2_sha256

from app.db import get_db
from app.models import Employee, LeaveBalance, Department
from app.deps import get_current_user, require_role
from app.services.onboarding import instantiate
from app.helpers import now, audit

router = APIRouter(prefix="/employees", tags=["employees"])


class EmployeeCreateIn(BaseModel):
    name: str
    email: str
    password: str
    role: str
    department_id: int = None
    manager_id: int = None
    join_date: str


@router.post("/")
def create_employee(
    body: EmployeeCreateIn,
    user: Employee = Depends(require_role("hr_admin")),
    db: Session = Depends(get_db),
):
    """Create new employee (hr_admin only). Creates balances and starts onboarding."""
    # Check email uniqueness
    existing = db.query(Employee).filter_by(email=body.email).first()
    if existing:
        raise HTTPException(400, "Email already exists")
    
    # Validate role
    if body.role not in ("employee", "manager", "hr_admin"):
        raise HTTPException(400, "Invalid role")
    
    # Create employee
    password_hash = pbkdf2_sha256.hash(body.password)
    employee = Employee(
        name=body.name,
        email=body.email,
        password_hash=password_hash,
        role=body.role,
        department_id=body.department_id,
        manager_id=body.manager_id,
        join_date=body.join_date,
        employment_status="active",
    )
    db.add(employee)
    db.flush()
    
    # Create leave balances (casual, earned, sick)
    for leave_type, total_days in [("casual", 12), ("earned", 15), ("sick", 10)]:
        balance = LeaveBalance(
            employee_id=employee.id,
            leave_type=leave_type,
            total_days=total_days,
            used_days=0,
            pending_days=0,
        )
        db.add(balance)
    
    db.flush()
    
    # Start onboarding flow (only for employees, not managers/admins)
    if body.role == "employee":
        try:
            instantiate(db, employee)
        except Exception as e:
            # Log but don't fail the employee creation
            print(f"Failed to instantiate onboarding: {e}")
    
    audit(db, user.id, "create_employee", "employee", employee.id,
          {"email": body.email, "role": body.role})
    
    db.commit()
    
    return {
        "id": employee.id,
        "name": employee.name,
        "email": employee.email,
        "role": employee.role,
        "join_date": employee.join_date,
    }


@router.get("/")
def list_employees(
    user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all employees."""
    employees = db.query(Employee).all()
    
    return [
        {
            "id": e.id,
            "name": e.name,
            "email": e.email,
            "role": e.role,
            "department_id": e.department_id,
            "manager_id": e.manager_id,
            "join_date": e.join_date,
            "employment_status": e.employment_status,
        }
        for e in employees
    ]
