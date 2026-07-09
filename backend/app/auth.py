import os
from datetime import datetime, timedelta
import jwt
from passlib.hash import pbkdf2_sha256

SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
ALGO = "HS256"
TOKEN_TTL_HOURS = 12  # ponytail: long-lived token, no refresh; add refresh flow if session length matters

def verify_password(plain: str, hashed: str) -> bool:
    return pbkdf2_sha256.verify(plain, hashed)

def create_token(employee) -> str:
    payload = {
        "sub": str(employee.id),
        "role": employee.role,
        "exp": datetime.utcnow() + timedelta(hours=TOKEN_TTL_HOURS),
    }
    return jwt.encode(payload, SECRET, algorithm=ALGO)

def decode_token(token: str) -> dict:
    return jwt.decode(token, SECRET, algorithms=[ALGO])
