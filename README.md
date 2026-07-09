# PeopleOS — Smart HR Self-Service Portal

A **role-aware HR management system** with 3 end-to-end flows (leave, onboarding, expenses) backed by FastAPI, SQLite, and React.

## Live URLs

- Frontend: https://REPLACE-WITH-VERCEL-URL
- Backend:  https://REPLACE-WITH-RAILWAY-URL

> Note: the demo uses SQLite on ephemeral disk and local file storage for
> receipts. Both reset on redeploy. Re-run `python seed.py` after a redeploy.

## Quick Start

### Prerequisites
- Python 3.10+, Node.js 18+, npm
- `git` and a terminal

### Backend Setup (3 commands)
```bash
cd people-os/backend
python -m venv .venv && source .venv/bin/activate  # .venv\Scripts\activate on Windows
pip install -r requirements.txt
python seed.py  # recreates DB from schema.sql + seed data
uvicorn app.main:app --port 8000  # runs on http://localhost:8000
```

### Frontend Setup (2 commands)
```bash
cd people-os/frontend
npm install
npm run dev  # runs on http://localhost:5173
```

## Demo Logins

| Email | Password | Role |
|---|---|---|
| admin@co.com | password123 | hr_admin |
| maya@co.com | password123 | manager |
| raj@co.com | password123 | employee |
| dev@co.com | password123 | employee |
| newbie@co.com | password123 | new_hire |

## Architecture

### Backend (FastAPI)
- **Auth**: JWT tokens, server-side RBAC (role checked on every endpoint)
- **DB**: SQLite with 11 tables, schema in `schema.sql`, seed in `seed.py`
- **Endpoints**: `/auth/login`, `/dashboard`, `/leave/*`, `/expenses/*`, `/onboarding/*`, `/employees/*`, `/notifications/*`
- **RBAC**: `require_role("manager", "hr_admin")` dependency enforces 403 on unauthorized access

### Frontend (React + Vite + Tailwind)
- **Pages**: Login, Dashboard (4 contextual views), Leave, Expenses, Onboarding
- **Auth**: JWT token in localStorage, AuthProvider + useAuth() hook
- **API Layer**: `api()` fetch wrapper (auto-attaches bearer token)
- **Polling**: `usePoll()` hook refreshes data every 4 seconds

### Database
- **Tables**: departments, employees, leave_balances, leave_requests, documents, onboarding_templates, onboarding_runs, onboarding_tasks, expenses, audit_logs, notifications
- **Constraints**: Foreign keys enforced, role CHECK constraint, status enums
- **Seed**: 5 employees (admin, manager, 2 employees, 1 new hire), 1 onboarding template, 1 sample expense

---

## Three Flows (Judge Tests)

### 1. **Leave Flow** ✅
1. Employee applies for leave (picks date range, auto-detects type: casual ≤1 day, earned >1 day)
2. Balance auto-decremented as `pending_days` (reserved until approved/rejected)
3. Manager approves/rejects (updates balance and status)
4. Team calendar shows approved leaves (manager sees reports, employee sees own team)

**Test**: `cd people-os/backend && python -c "..."` (see check_leave.py in plan)

### 2. **Onboarding Flow** ✅
1. HR Admin creates new employee → triggers `instantiate()` event engine
2. Engine picks template, creates run + tasks with dependency graph
3. Tasks blocked until dependency is done (e.g., task 3 blocked until task 0 done)
4. New hire marks tasks complete → unblocks dependents
5. Run auto-completes when all tasks done

**Test**: `rbac_smoke.py` verifies new-hire onboarding auto-starts on create

### 3. **Expense Flow** ✅
1. Employee submits expense with amount, category, receipt file
2. File saved to `uploads/`, status set by amount chain:
   - `< $5000` → `with_manager` (manager approves)
   - `>= $5000` → `with_finance` (escalates to HR admin)
3. Approver sees expense in queue, views receipt (ownership-checked), approves/rejects
4. Audit log written on receipt access

**Test**: `check_expense.py` verifies workflow

---

## RBAC + Security

### Rule: **Server-side, always**
- Every endpoint depends on `get_current_user` (JWT decode + DB role lookup)
- `require_role(*roles)` dependency returns **403** if mismatch (not filtered data)
- Frontend hides buttons; backend enforces permissions

### Four Judge Tests
1. **Employee → 403 on leave approve**: Employee tries `/leave/{id}/approve` → 403
2. **Employee → 403 on HR create**: Employee tries `POST /employees` → 403
3. **Manager → 403 on HR pipeline**: Manager tries `GET /onboarding/pipeline` → 403
4. **New-hire onboarding auto-starts**: Nina Newbie (seeded 3 days ago) has onboarding run

**Verify all 4**: `cd people-os/backend && python seed.py && python rbac_smoke.py`

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | FastAPI, SQLAlchemy, PyJWT, passlib[pbkdf2], python-multipart, uvicorn |
| Frontend | React 19, Vite, TypeScript, Tailwind CSS, shadcn/ui (minimal), react-router-dom, react-day-picker |
| Database | SQLite (file-based; use `DATABASE_URL` env var to swap for Postgres/Supabase) |
| Auth | JWT (12-hour TTL by default) |
| Storage | Files → `backend/uploads/`, served via auth-checked endpoint |

---

## Project Structure

```
people-os/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, routes mounted
│   │   ├── models.py            # SQLAlchemy ORM models
│   │   ├── db.py                # SessionLocal, Base, get_db()
│   │   ├── auth.py              # JWT encode/decode, verify_password
│   │   ├── deps.py              # get_current_user, require_role
│   │   ├── helpers.py           # now(), notify(), audit()
│   │   ├── routers/
│   │   │   ├── auth_router.py   # POST /auth/login, GET /auth/me
│   │   │   ├── dashboard.py     # GET /dashboard (contextual view)
│   │   │   ├── leave.py         # POST /leave, /leave/{id}/{approve|reject}, GET /leave/mine|team
│   │   │   ├── employees.py     # POST /employees (HR only), GET /employees
│   │   │   ├── onboarding.py    # POST /onboarding/tasks/{id}/complete, GET /onboarding/mine|pipeline
│   │   │   ├── expenses.py      # POST /expenses, approve/reject, GET /expenses/mine|queue|{id}/receipt
│   │   │   └── notifications.py # GET /notifications, POST /notifications/{id}/read, GET /notifications/unread_count
│   │   └── services/
│   │       └── onboarding.py    # instantiate(db, employee), complete_task()
│   ├── schema.sql               # 11-table schema (reviewed artifact)
│   ├── seed.py                  # Recreate DB in one command
│   ├── peopleos.db              # SQLite file (gitignored)
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # BrowserRouter, Routes, Layout wrapper
│   │   ├── main.tsx             # AuthProvider, render root
│   │   ├── lib/
│   │   │   ├── api.ts           # api() fetch wrapper, ApiError
│   │   │   ├── auth.tsx         # AuthProvider, useAuth() hook
│   │   │   ├── usePoll.ts       # usePoll(fn, ms) hook (4s default)
│   │   │   └── utils.ts         # cn() Tailwind merge utility
│   │   ├── components/
│   │   │   ├── Layout.tsx       # Header, nav, logout, NotificationBell
│   │   │   ├── NotificationBell.tsx
│   │   │   └── ui/              # Button, Card, Input, Badge (shadcn copies)
│   │   └── pages/
│   │       ├── Login.tsx        # Email/password form + demo buttons
│   │       ├── Dashboard.tsx    # Contextual: new_hire|employee|manager|hr_admin
│   │       ├── Leave.tsx        # Calendar, apply, my leaves, queue
│   │       ├── Expenses.tsx     # Submit, my expenses, queue, receipt upload
│   │       └── Onboarding.tsx   # Checklist, task completion, HR create
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   ├── package.json
│   └── public/
│
└── .gitignore
```

---

## Key Design Decisions

### 1. Schema-First, ORM Second
- `schema.sql` is the reviewed source of truth (migrations, constraints, indices)
- ORM models in `models.py` mirror the schema (column names identical)
- Seed logic separates schema from data

### 2. Event-Driven Onboarding
- `instantiate(db, employee)` called synchronously inside `POST /employees` handler
- Creates onboarding run + tasks (with dependency DAG) in same transaction
- Event engine is a pure function, not a queue (fits 3-hour window)

### 3. RBAC via FastAPI Dependencies
- Every endpoint depends on `get_current_user` or `require_role(*roles)`
- Role checked against DB (not trusted from token)
- Ownership checks inline in handlers (e.g., "is this your expense?")
- Frontend hides buttons; backend always says no

### 4. Polling Over WebSocket
- 4-second `usePoll()` hook on every page
- Simpler than WebSockets for demo; sufficient for UI coherence
- Production: use WebSockets or Server-Sent Events

### 5. File Storage
- Receipts/documents saved to `backend/uploads/` with UUID filenames
- Served via `GET /expenses/{id}/receipt` (auth + ownership checked)
- Audit log written on access
- Production: use S3, GCS, or managed blob storage

---

## Commands Reference

### Database
```bash
cd people-os/backend
python seed.py                 # Drop, recreate, seed DB
sqlite3 peopleos.db '.schema'  # Inspect schema
```

### Backend
```bash
cd people-os/backend
source .venv/bin/activate      # activate venv
pip install -r requirements.txt # install deps
uvicorn app.main:app --port 8000 --reload
python rbac_smoke.py           # verify RBAC + 4 judge tests
```

### Frontend
```bash
cd people-os/frontend
npm install                    # install deps
npm run dev                    # dev server (port 5173)
npm run build                  # production build
npm run lint                   # run linter
```

### Endpoints (Backend, `http://localhost:8000`)
- `POST /auth/login` — login
- `GET /dashboard` — contextual dashboard
- `POST /leave` — apply for leave
- `POST /leave/{id}/{approve|reject}` — manager approves/rejects
- `GET /leave/mine` — my leaves
- `GET /leave/team` — team calendar
- `POST /employees` — create employee (HR only)
- `GET /employees` — list employees
- `POST /onboarding/tasks/{id}/complete` — mark task done
- `GET /onboarding/mine` — my checklist
- `GET /onboarding/pipeline` — HR admin pipeline
- `POST /expenses` — submit expense (multipart)
- `POST /expenses/{id}/{approve|reject}` — approve/reject
- `GET /expenses/mine` — my expenses
- `GET /expenses/queue` — approval queue
- `GET /expenses/{id}/receipt` — download receipt (auth + ownership)
- `GET /notifications` — my notifications
- `POST /notifications/{id}/read` — mark read
- `GET /notifications/unread_count` — unread count

---

## Deployment

### Backend (Railway)
```bash
cd people-os/backend
railway init
railway up
railway run python seed.py  # seed once
```
Set env vars: `JWT_SECRET`, optionally `DATABASE_URL` (Supabase Postgres connection string).

### Frontend (Vercel)
```bash
cd people-os/frontend
vercel
```
Set env var: `VITE_API_BASE` = your Railway backend URL.

### Local + External DB (Supabase)
1. Create Supabase project, get connection string
2. Set `DATABASE_URL=postgresql://...` in backend
3. Run `schema.sql` in Supabase SQL editor
4. Run `python seed.py` (uses `DATABASE_URL` env var)

---

## Testing

### Unit/Integration
No unit tests in this implementation (3-hour window). Focus on E2E verification:

```bash
cd people-os/backend && python rbac_smoke.py  # 4 judge tests
```

### Manual E2E
1. Start backend: `uvicorn app.main:app --port 8000`
2. Start frontend: `npm run dev` (port 5173)
3. Login as maya@co.com → see manager dashboard
4. Apply leave (pick date range) → approve as maya → see balance drop
5. Submit expense → approve as maya → see status flip
6. Create new hire as admin → login as new hire → see onboarding checklist
7. Try evil actor: as raj@co.com, POST to `/onboarding/pipeline` → 403

---

## Troubleshooting

### Frontend can't reach backend
Check CORS origin in `app/main.py`:
```python
allow_origins=["http://localhost:5173"]  # dev
```
Production: set to Vercel URL.

### `peopleos.db` not found
Run `python seed.py` in `backend/` directory.

### JWT token expired
Default TTL is 12 hours. Refresh by logging out + logging back in (no refresh token flow yet).

### File upload fails
Ensure `backend/uploads/` is writable: `chmod 755 people-os/backend/uploads`.

---

## Future Enhancements

- **JWT Refresh Tokens** (Task 13) — add `POST /auth/refresh` endpoint
- **Real-time Notifications** — WebSockets instead of polling
- **Approval Chains** — multi-step workflows (e.g., manager → HR → CFO)
- **Payroll Integration** — link expenses to employee accounts
- **Mobile App** — React Native reusing API layer
- **Analytics** — dashboards for HR: hiring trends, leave patterns, spend by category
- **Integrations** — Slack notifications, calendar sync, LDAP auth

---

## License & Attribution

This is a demo project for educational purposes. Built with ❤️ in 3 hours.

---

**Happy HR-ing! 🚀**
