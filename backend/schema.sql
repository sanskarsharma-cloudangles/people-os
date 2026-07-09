PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS onboarding_tasks;
DROP TABLE IF EXISTS onboarding_runs;
DROP TABLE IF EXISTS onboarding_templates;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS leave_requests;
DROP TABLE IF EXISTS leave_balances;
DROP TABLE IF EXISTS employees;
DROP TABLE IF EXISTS departments;

CREATE TABLE departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  head_employee_id INTEGER
);

CREATE TABLE employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('employee','manager','hr_admin')),
  department_id INTEGER REFERENCES departments(id),
  manager_id INTEGER REFERENCES employees(id),
  join_date TEXT NOT NULL,
  employment_status TEXT NOT NULL DEFAULT 'active'
);
CREATE INDEX idx_employees_manager ON employees(manager_id);
CREATE INDEX idx_employees_role ON employees(role);

CREATE TABLE leave_balances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  leave_type TEXT NOT NULL,
  total_days REAL NOT NULL,
  used_days REAL NOT NULL DEFAULT 0,
  pending_days REAL NOT NULL DEFAULT 0
);
CREATE INDEX idx_balances_emp ON leave_balances(employee_id);

CREATE TABLE leave_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  leave_type TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  days REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  approver_id INTEGER REFERENCES employees(id),
  applied_at TEXT NOT NULL,
  resolved_at TEXT,
  note TEXT
);
CREATE INDEX idx_leave_emp ON leave_requests(employee_id);
CREATE INDEX idx_leave_status ON leave_requests(status);

CREATE TABLE documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER REFERENCES employees(id),
  doc_type TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  storage_url TEXT NOT NULL,
  uploaded_by INTEGER REFERENCES employees(id),
  visible_to_roles TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL
);
CREATE INDEX idx_docs_owner ON documents(owner_id);

CREATE TABLE onboarding_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  role_target TEXT NOT NULL,
  steps TEXT NOT NULL
);

CREATE TABLE onboarding_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  template_id INTEGER NOT NULL REFERENCES onboarding_templates(id),
  started_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed'))
);
CREATE INDEX idx_runs_emp ON onboarding_runs(employee_id);
CREATE INDEX idx_runs_status ON onboarding_runs(status);

CREATE TABLE onboarding_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL REFERENCES onboarding_runs(id),
  step_index INTEGER NOT NULL,
  title TEXT NOT NULL,
  owner_id INTEGER REFERENCES employees(id),
  depends_on INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','blocked','done')),
  completed_at TEXT
);
CREATE INDEX idx_tasks_run ON onboarding_tasks(run_id);

CREATE TABLE expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  amount REAL NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  receipt_url TEXT,
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted','with_manager','with_finance','approved','rejected','paid')),
  approver_id INTEGER REFERENCES employees(id),
  submitted_at TEXT NOT NULL,
  resolved_at TEXT
);
CREATE INDEX idx_exp_emp ON expenses(employee_id);
CREATE INDEX idx_exp_approver ON expenses(approver_id);
CREATE INDEX idx_exp_status ON expenses(status);

CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id INTEGER NOT NULL REFERENCES employees(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id INTEGER,
  metadata TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_audit_actor ON audit_logs(actor_id);

CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipient_id INTEGER NOT NULL REFERENCES employees(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_notif_recipient ON notifications(recipient_id);
