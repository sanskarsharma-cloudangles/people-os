from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth_router, dashboard, leave, employees, onboarding, expenses, notifications

app = FastAPI(title="PeopleOS")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(dashboard.router)
app.include_router(leave.router)
app.include_router(employees.router)
app.include_router(onboarding.router)
app.include_router(expenses.router)
app.include_router(notifications.router)

@app.get("/health")
def health():
    return {"ok": True}
