from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey
from app.db import Base

class Department(Base):
    __tablename__ = "departments"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    head_employee_id = Column(Integer)

class Employee(Base):
    __tablename__ = "employees"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"))
    manager_id = Column(Integer, ForeignKey("employees.id"))
    join_date = Column(String, nullable=False)
    employment_status = Column(String, default="active")

class LeaveBalance(Base):
    __tablename__ = "leave_balances"
    id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    leave_type = Column(String, nullable=False)
    total_days = Column(Float, nullable=False)
    used_days = Column(Float, default=0)
    pending_days = Column(Float, default=0)

class LeaveRequest(Base):
    __tablename__ = "leave_requests"
    id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    leave_type = Column(String, nullable=False)
    start_date = Column(String, nullable=False)
    end_date = Column(String, nullable=False)
    days = Column(Float, nullable=False)
    status = Column(String, default="pending")
    approver_id = Column(Integer, ForeignKey("employees.id"))
    applied_at = Column(String, nullable=False)
    resolved_at = Column(String)
    note = Column(Text)

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True)
    owner_id = Column(Integer, ForeignKey("employees.id"))
    doc_type = Column(String, nullable=False)
    version = Column(Integer, default=1)
    storage_url = Column(String, nullable=False)
    uploaded_by = Column(Integer, ForeignKey("employees.id"))
    visible_to_roles = Column(String, default="[]")
    created_at = Column(String, nullable=False)

class OnboardingTemplate(Base):
    __tablename__ = "onboarding_templates"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    role_target = Column(String, nullable=False)
    steps = Column(Text, nullable=False)

class OnboardingRun(Base):
    __tablename__ = "onboarding_runs"
    id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    template_id = Column(Integer, ForeignKey("onboarding_templates.id"), nullable=False)
    started_at = Column(String, nullable=False)
    completed_at = Column(String)
    status = Column(String, default="in_progress")

class OnboardingTask(Base):
    __tablename__ = "onboarding_tasks"
    id = Column(Integer, primary_key=True)
    run_id = Column(Integer, ForeignKey("onboarding_runs.id"), nullable=False)
    step_index = Column(Integer, nullable=False)
    title = Column(String, nullable=False)
    owner_id = Column(Integer, ForeignKey("employees.id"))
    depends_on = Column(Integer)
    status = Column(String, default="pending")
    completed_at = Column(String)

class Expense(Base):
    __tablename__ = "expenses"
    id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    amount = Column(Float, nullable=False)
    category = Column(String, nullable=False)
    description = Column(Text)
    receipt_url = Column(String)
    status = Column(String, default="submitted")
    approver_id = Column(Integer, ForeignKey("employees.id"))
    submitted_at = Column(String, nullable=False)
    resolved_at = Column(String)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True)
    actor_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    action = Column(String, nullable=False)
    resource_type = Column(String, nullable=False)
    resource_id = Column(Integer)
    metadata_json = Column("metadata", Text)
    created_at = Column(String, nullable=False)

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True)
    recipient_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    body = Column(Text)
    link = Column(String)
    read = Column(Integer, default=0)
    created_at = Column(String, nullable=False)
