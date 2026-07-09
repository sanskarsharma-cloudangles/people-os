#!/usr/bin/env python
"""
RBAC Smoke Test for PeopleOS Backend
Verifies:
1. Employee → 403 on manager endpoints (leave approve)
2. Employee → 403 on HR create endpoint
3. Manager → 403 on HR pipeline endpoint
4. New-hire onboarding auto-starts
"""
import sys
import subprocess
import json
from datetime import datetime, timedelta, date
import os
import sqlite3
from pathlib import Path

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from app.auth import create_token
from app.db import SessionLocal
from app.models import Employee


def run_test(test_name: str, method: str, endpoint: str, headers: dict, json_data=None) -> bool:
    """Run a single HTTP test and return True if it passes."""
    import subprocess
    
    cmd = [
        "curl",
        "-X", method,
        f"http://localhost:8000{endpoint}",
        "-H", "Content-Type: application/json",
    ]
    
    # Add auth header
    if "Authorization" in headers:
        cmd.extend(["-H", f"Authorization: Bearer {headers['Authorization']}"])
    
    # Add body
    if json_data:
        cmd.extend(["-d", json.dumps(json_data)])
    
    # Capture response
    cmd.extend(["-w", "\n%{http_code}"])
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
        output = result.stdout.strip().split("\n")
        status_code = int(output[-1])
        
        print(f"  ✓ {test_name}: {status_code}")
        return status_code
    except Exception as e:
        print(f"  ✗ {test_name}: {e}")
        return None


def main():
    """Run RBAC smoke tests."""
    print("\n=== PeopleOS RBAC Smoke Tests ===\n")
    
    # Connect to database
    db = SessionLocal()
    
    try:
        # Get test employees
        employees = {
            "admin": db.query(Employee).filter_by(email="admin@co.com").first(),
            "manager": db.query(Employee).filter_by(email="maya@co.com").first(),
            "employee": db.query(Employee).filter_by(email="raj@co.com").first(),
            "new_hire": db.query(Employee).filter_by(email="newbie@co.com").first(),
        }
        
        if not all(employees.values()):
            print("ERROR: Could not load test employees from database")
            return False
        
        # Create tokens
        tokens = {k: create_token(v) for k, v in employees.items()}
        
        print("Test 1: Employee → 403 on manager endpoints (leave approve)")
        print("-" * 60)
        
        # Find a leave request to approve (apply one first if needed)
        from app.models import LeaveRequest, LeaveBalance
        
        emp = employees["employee"]
        
        # Create a test leave request
        balance = db.query(LeaveBalance).filter_by(
            employee_id=emp.id,
            leave_type="casual"
        ).first()
        
        if balance and (balance.total_days - balance.used_days - balance.pending_days) >= 2:
            leave_req = LeaveRequest(
                employee_id=emp.id,
                leave_type="casual",
                start_date=(date.today() + timedelta(days=5)).isoformat(),
                end_date=(date.today() + timedelta(days=6)).isoformat(),
                days=2,
                status="pending",
                applied_at=datetime.utcnow().isoformat(),
            )
            db.add(leave_req)
            db.flush()
            leave_id = leave_req.id
            db.commit()
            
            # Try to approve as employee (should fail with 403)
            status = run_test(
                "Employee trying to approve own leave",
                "POST",
                f"/leave/{leave_id}/approve",
                {"Authorization": tokens["employee"]},
            )
            
            if status == 403:
                print("  ✓ Test 1 PASSED: Employee correctly denied\n")
                test1_pass = True
            else:
                print(f"  ✗ Test 1 FAILED: Expected 403, got {status}\n")
                test1_pass = False
        else:
            print("  ⊘ Test 1 SKIPPED: Insufficient leave balance\n")
            test1_pass = None
        
        print("Test 2: Employee → 403 on HR create endpoint")
        print("-" * 60)
        
        # Try to create employee as employee (should fail with 403)
        status = run_test(
            "Employee trying to create new employee",
            "POST",
            "/employees/",
            {"Authorization": tokens["employee"]},
            {
                "name": "Test User",
                "email": "test@co.com",
                "password": "password123",
                "role": "employee",
                "join_date": date.today().isoformat(),
            }
        )
        
        if status == 403:
            print("  ✓ Test 2 PASSED: Employee correctly denied\n")
            test2_pass = True
        else:
            print(f"  ✗ Test 2 FAILED: Expected 403, got {status}\n")
            test2_pass = False
        
        print("Test 3: Manager → 403 on HR pipeline endpoint")
        print("-" * 60)
        
        # Try to access HR pipeline as manager (should fail with 403)
        status = run_test(
            "Manager trying to access onboarding pipeline",
            "GET",
            "/onboarding/pipeline",
            {"Authorization": tokens["manager"]},
        )
        
        if status == 403:
            print("  ✓ Test 3 PASSED: Manager correctly denied\n")
            test3_pass = True
        else:
            print(f"  ✗ Test 3 FAILED: Expected 403, got {status}\n")
            test3_pass = False
        
        print("Test 4: New-hire onboarding auto-starts")
        print("-" * 60)
        
        # Check that new hire has an onboarding run
        from app.models import OnboardingRun
        
        new_hire = employees["new_hire"]
        run = db.query(OnboardingRun).filter_by(
            employee_id=new_hire.id,
            status="in_progress"
        ).first()
        
        if run:
            print(f"  ✓ New hire {new_hire.name} has onboarding run #{run.id}")
            print(f"  ✓ Test 4 PASSED: Onboarding auto-started\n")
            test4_pass = True
        else:
            print(f"  ✗ New hire {new_hire.name} has no onboarding run")
            print(f"  ✗ Test 4 FAILED: Onboarding not auto-started\n")
            test4_pass = False
        
        # Summary
        print("=" * 60)
        print("SUMMARY")
        print("=" * 60)
        
        results = {
            "Test 1 (Employee → 403 leave approve)": test1_pass,
            "Test 2 (Employee → 403 HR create)": test2_pass,
            "Test 3 (Manager → 403 HR pipeline)": test3_pass,
            "Test 4 (New-hire onboarding)": test4_pass,
        }
        
        passed = sum(1 for v in results.values() if v is True)
        failed = sum(1 for v in results.values() if v is False)
        skipped = sum(1 for v in results.values() if v is None)
        
        for name, result in results.items():
            if result is True:
                print(f"✓ {name}")
            elif result is False:
                print(f"✗ {name}")
            else:
                print(f"⊘ {name}")
        
        print(f"\nTotal: {passed} passed, {failed} failed, {skipped} skipped")
        
        if failed == 0:
            print("\n✓ All RBAC smoke tests PASSED")
            return True
        else:
            print(f"\n✗ {failed} test(s) FAILED")
            return False
    
    finally:
        db.close()


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
