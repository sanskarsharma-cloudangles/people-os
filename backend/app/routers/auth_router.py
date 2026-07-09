from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Employee
from app.auth import verify_password, create_token
from app.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

class LoginIn(BaseModel):
    email: str
    password: str

def user_out(u: Employee):
    return {"id": u.id, "name": u.name, "role": u.role, "email": u.email}

@router.post("/login")
def login(body: LoginIn, db: Session = Depends(get_db)):
    u = db.query(Employee).filter_by(email=body.email).first()
    if not u or not verify_password(body.password, u.password_hash):
        raise HTTPException(401, "Invalid credentials")
    return {"access_token": create_token(u), "user": user_out(u)}

@router.get("/me")
def me(user: Employee = Depends(get_current_user)):
    return user_out(user)
