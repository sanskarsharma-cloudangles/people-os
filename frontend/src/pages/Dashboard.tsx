import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Check, X } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'

// Shapes below mirror backend/app/routers/dashboard.py exactly. Backend is source of truth.
interface LeaveBalance {
  leave_type: string
  total_days: number
  used_days: number
  pending_days: number
  available: number
}
interface OnboardingTask {
  id: number
  title: string
  status: string // pending | blocked | done
  owner_id: number | null
}
interface PendingLeaveApproval {
  id: number
  employee_id: number
  employee_name: string
  leave_type: string
  start_date: string
  end_date: string
  days: number
  applied_at: string
}
interface PendingExpense {
  id: number
  employee_id: number
  amount: number
  category: string
  status: string
  submitted_at: string
}
interface DashboardView {
  view: 'new_hire' | 'employee' | 'manager' | 'hr_admin'
  onboarding?: { run_id: number; status: string; tasks: OnboardingTask[] }
  leave_balances?: LeaveBalance[]
  pending_leaves?: Array<{ id: number; leave_type: string; start_date: string; end_date: string; days: number; status: string }>
  pending_approvals?: PendingLeaveApproval[]
  pending_expenses?: PendingExpense[]
  metrics?: {
    total_employees: number
    new_hires_30_days: number
    onboarding_in_progress: number
    pending_expense_approvals: number
  }
}

function totalAvailable(balances?: LeaveBalance[]) {
  return (balances || []).reduce((sum, b) => sum + b.available, 0)
}

// map onboarding task status -> Badge variant (Badge has no "done", uses "approved")
function taskVariant(status: string): 'pending' | 'blocked' | 'approved' {
  if (status === 'done') return 'approved'
  if (status === 'blocked') return 'blocked'
  return 'pending'
}

export function Dashboard() {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardView | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    const fetchDashboard = async () => {
      try {
        const d = await api<DashboardView>('/dashboard')
        if (alive) { setData(d); setError('') }
      } catch (err) {
        console.error('Failed to fetch dashboard:', err)
        if (alive) setError('Failed to load dashboard data')
      } finally {
        if (alive) setIsLoading(false)
      }
    }
    fetchDashboard()
    const id = setInterval(fetchDashboard, 4000) // poll for "real-time"
    return () => { alive = false; clearInterval(id) }
  }, [])

  async function resolveLeave(id: number, action: 'approve' | 'reject') {
    try {
      await api(`/leave/${id}/${action}`, { method: 'POST' })
    } catch (e) {
      console.error(e)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <p className="text-slate-500">Loading dashboard...</p>
      </div>
    )
  }
  if (error) {
    return <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">{error}</div>
  }
  if (!data) {
    return <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-700">No dashboard data available</div>
  }

  const tasks = data.onboarding?.tasks || []
  const done = tasks.filter((t) => t.status === 'done').length
  const progress = tasks.length ? Math.round((100 * done) / tasks.length) : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Welcome, {user?.name || user?.email}!</h1>
        <p className="text-slate-600 mt-1 capitalize">{data.view.replace('_', ' ')} Dashboard</p>
      </div>

      {/* New Hire View */}
      {data.view === 'new_hire' && (
        <Card className="p-6">
          <div className="flex justify-center mb-2">
            <img src="/illustrations/welcome.svg" alt="" className="w-24 h-24" />
          </div>
          <h2 className="text-xl font-semibold mb-4">Onboarding Progress</h2>
          <div className="flex items-center justify-center mb-6">
            <div className="relative h-32 w-32">
              <svg className="h-32 w-32 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="54" strokeWidth="8" fill="none" className="stroke-slate-200" />
                <circle cx="60" cy="60" r="54" strokeWidth="8" fill="none"
                  strokeDasharray={`${progress * 3.39} 339`} className="stroke-slate-900 transition-all" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-center">
                <div>
                  <div className="text-3xl font-bold">{progress}%</div>
                  <div className="text-xs text-slate-500">Complete</div>
                </div>
              </div>
            </div>
          </div>
          <h3 className="font-medium text-slate-900 mb-3">Your Tasks</h3>
          <div className="space-y-2">
            {tasks.length === 0 && <p className="text-sm text-slate-500">No tasks assigned yet</p>}
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between p-3 rounded border border-slate-200">
                <span className={task.status === 'done' ? 'line-through text-slate-400' : ''}>{task.title}</span>
                <Badge variant={taskVariant(task.status)}>{task.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Employee View */}
      {data.view === 'employee' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Leave Balance</h2>
            <div className="space-y-1">
              {(data.leave_balances || []).map((b) => (
                <div key={b.leave_type} className="flex justify-between">
                  <span className="capitalize text-slate-700">{b.leave_type}</span>
                  <b>{b.available} left</b>
                </div>
              ))}
            </div>
            <p className="text-sm text-slate-500 mt-3">{totalAvailable(data.leave_balances)} total days available</p>
          </Card>
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Pending Leave Requests</h2>
            <div className="text-4xl font-bold text-slate-900">{(data.pending_leaves || []).length}</div>
            <p className="text-sm text-slate-500 mt-2">awaiting approval</p>
          </Card>
        </div>
      )}

      {/* Manager View */}
      {data.view === 'manager' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Pending Leave Approvals</h2>
            <div className="space-y-2">
              {(data.pending_approvals || []).length === 0 && <p className="text-sm text-slate-500">Nothing to approve</p>}
              {(data.pending_approvals || []).map((l) => (
                <div key={l.id} className="flex justify-between items-center border-b border-slate-100 py-2">
                  <span>{l.employee_name} · {l.leave_type} · {l.days}d</span>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => resolveLeave(l.id, 'approve')}>
                      <Check size={16} />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => resolveLeave(l.id, 'reject')}>
                      <X size={16} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Pending Expense Approvals</h2>
            <div className="space-y-2">
              {(data.pending_expenses || []).length === 0 && <p className="text-sm text-slate-500">Queue empty</p>}
              {(data.pending_expenses || []).map((e) => (
                <div key={e.id} className="flex justify-between items-center border-b border-slate-100 py-2">
                  <span>#{e.employee_id} · {e.category}</span>
                  <span className="font-medium">{e.amount}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* HR Admin View */}
      {data.view === 'hr_admin' && data.metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="text-sm text-slate-500">Total Employees</div>
            <div className="text-4xl font-bold text-slate-900 mt-1">{data.metrics.total_employees}</div>
          </Card>
          <Card className="p-6">
            <div className="text-sm text-slate-500">New Hires (30d)</div>
            <div className="text-4xl font-bold text-slate-900 mt-1">{data.metrics.new_hires_30_days}</div>
          </Card>
          <Card className="p-6">
            <div className="text-sm text-slate-500">Onboarding In Progress</div>
            <div className="text-4xl font-bold text-slate-900 mt-1">{data.metrics.onboarding_in_progress}</div>
          </Card>
          <Card className="p-6">
            <div className="text-sm text-slate-500">Expenses in Finance</div>
            <div className="text-4xl font-bold text-slate-900 mt-1">{data.metrics.pending_expense_approvals}</div>
          </Card>
        </div>
      )}
    </div>
  )
}
