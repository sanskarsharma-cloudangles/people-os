"""Recreate the full DB in one command: python seed.py"""
import json, os, sqlite3
from datetime import date, datetime, timedelta
from passlib.hash import pbkdf2_sha256

DB = os.path.join(os.path.dirname(__file__), "peopleos.db")
SCHEMA = os.path.join(os.path.dirname(__file__), "schema.sql")

def main():
    if os.path.exists(DB):
        os.remove(DB)
    con = sqlite3.connect(DB)
    con.executescript(open(SCHEMA).read())
    cur = con.cursor()
    now = datetime.utcnow().isoformat()
    pw = pbkdf2_sha256.hash("password123")

    # departments
    cur.execute("INSERT INTO departments (name) VALUES ('Engineering')")      # 1
    cur.execute("INSERT INTO departments (name) VALUES ('People')")            # 2

    def emp(name, email, role, dept, mgr, join):
        cur.execute(
            "INSERT INTO employees (name,email,password_hash,role,department_id,manager_id,join_date) "
            "VALUES (?,?,?,?,?,?,?)",
            (name, email, pw, role, dept, mgr, join),
        )
        return cur.lastrowid

    today = date.today()
    admin = emp("Asha Admin", "admin@co.com", "hr_admin", 2, None, "2021-01-04")   # 1
    maya  = emp("Maya Manager", "maya@co.com", "manager", 1, admin, "2022-03-01")  # 2
    raj   = emp("Raj Employee", "raj@co.com", "employee", 1, maya, "2023-06-15")   # 3
    dev   = emp("Dev Kumar", "dev@co.com", "employee", 1, maya, "2023-09-01")      # 4
    newbie = emp("Nina Newbie", "newbie@co.com", "employee", 1, maya,
                 (today - timedelta(days=3)).isoformat())                          # 5
    cur.execute("UPDATE departments SET head_employee_id=? WHERE id=1", (maya,))
    cur.execute("UPDATE departments SET head_employee_id=? WHERE id=2", (admin,))

    # leave balances for everyone
    for eid in (maya, raj, dev, newbie):
        for lt, total in (("casual", 12), ("earned", 15), ("sick", 10)):
            cur.execute(
                "INSERT INTO leave_balances (employee_id,leave_type,total_days,used_days) VALUES (?,?,?,?)",
                (eid, lt, total, 0),
            )

    # one approved leave for team calendar realism
    cur.execute(
        "INSERT INTO leave_requests (employee_id,leave_type,start_date,end_date,days,status,approver_id,applied_at,resolved_at) "
        "VALUES (?,?,?,?,?,?,?,?,?)",
        (dev, "earned",
         (today + timedelta(days=2)).isoformat(),
         (today + timedelta(days=4)).isoformat(),
         3, "approved", maya, now, now),
    )

    # onboarding template
    steps = [
        {"title": "IT setup — laptop & accounts", "owner_role": "hr_admin", "depends_on": None, "deadline_days": 2},
        {"title": "Collect ID & tax documents",   "owner_role": "hr_admin", "depends_on": None, "deadline_days": 3},
        {"title": "Intro call with manager",       "owner_role": "manager",  "depends_on": 0,    "deadline_days": 5},
        {"title": "Acknowledge company policies",  "owner_role": "employee", "depends_on": 1,    "deadline_days": 7},
    ]
    cur.execute(
        "INSERT INTO onboarding_templates (name,role_target,steps) VALUES (?,?,?)",
        ("Standard Engineering Onboarding", "employee", json.dumps(steps)),
    )
    tmpl_id = cur.lastrowid

    # Create an onboarding run for the newbie (new hire)
    cur.execute(
        "INSERT INTO onboarding_runs (employee_id,template_id,started_at,status) VALUES (?,?,?,?)",
        (newbie, tmpl_id, now, "in_progress"),
    )
    run_id = cur.lastrowid

    # Create tasks for the newbie's onboarding run
    for idx, step in enumerate(steps):
        owner_role = step.get("owner_role")
        owner_id = None
        if owner_role == "employee":
            owner_id = newbie
        elif owner_role == "manager":
            owner_id = maya
        elif owner_role == "hr_admin":
            owner_id = admin

        task_status = "pending"
        depends_on = step.get("depends_on")
        if depends_on is not None and depends_on >= 0:
            task_status = "blocked"

        cur.execute(
            "INSERT INTO onboarding_tasks (run_id,step_index,title,owner_id,depends_on,status) VALUES (?,?,?,?,?,?)",
            (run_id, idx, step["title"], owner_id, depends_on, task_status),
        )

    # a sample expense in the manager's queue
    cur.execute(
        "INSERT INTO expenses (employee_id,amount,category,description,status,approver_id,submitted_at) "
        "VALUES (?,?,?,?,?,?,?)",
        (raj, 1200, "Travel", "Client visit cab fares", "with_manager", maya, now),
    )

    con.commit()
    con.close()
    print("Seeded", DB)

if __name__ == "__main__":
    main()
