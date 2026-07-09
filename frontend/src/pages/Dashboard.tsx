import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'

interface DashboardView {
  view: 'new_hire' | 'employee' | 'manager' | 'hr_admin'
  onboarding_progress?: number
  onboarding_tasks?: Array<{
    id: number
    title: string
    completed: boolean
  }>
  leave_balance?: number
  pending_expenses?: number
  pending_leave_approvals?: number
  pending_expense_approvals?: number
  team_count?: number
  onboarding_pipeline?: {
    new?: number
    in_progress?: number
    completed?: number
  }
}

export function Dashboard() {
  const { user, token } = useAuth()
  const [dashboardData, setDashboardData] = useState<DashboardView | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return

    const fetchDashboard = async () => {
      try {
        const data = await api<DashboardView>('/dashboard', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        setDashboardData(data)
        setError('')
      } catch (err) {
        console.error('Failed to fetch dashboard:', err)
        setError('Failed to load dashboard data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboard()
  }, [token])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <p className="text-gray-500">Loading dashboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
        {error}
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-700">
        No dashboard data available
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome, {user?.name || user?.email}!
        </h1>
        <p className="text-gray-600 mt-1 capitalize">
          {dashboardData.view.replace('_', ' ')} Dashboard
        </p>
      </div>

      {/* New Hire View */}
      {dashboardData.view === 'new_hire' && (
        <div className="grid grid-cols-1 gap-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Onboarding Progress</h2>
            <div className="space-y-4">
              {/* Progress Ring */}
              <div className="flex items-center justify-center mb-6">
                <div className="relative h-32 w-32">
                  <svg className="h-32 w-32 transform -rotate-90" viewBox="0 0 120 120">
                    <circle
                      cx="60"
                      cy="60"
                      r="54"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-gray-200"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="54"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${
                        (dashboardData.onboarding_progress || 0) * 3.39
                      } 339`}
                      className="text-blue-600 transition-all"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-3xl font-bold">
                        {dashboardData.onboarding_progress || 0}%
                      </div>
                      <div className="text-xs text-gray-500">Complete</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tasks List */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Your Tasks</h3>
                <div className="space-y-2">
                  {dashboardData.onboarding_tasks && dashboardData.onboarding_tasks.length > 0 ? (
                    dashboardData.onboarding_tasks.map((task) => (
                      <div
                        key={task.id}
                        className={`p-3 rounded border ${
                          task.completed
                            ? 'bg-green-50 border-green-200'
                            : 'bg-blue-50 border-blue-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={task.completed}
                            disabled
                            className="h-4 w-4"
                          />
                          <span
                            className={task.completed ? 'line-through text-gray-500' : ''}
                          >
                            {task.title}
                          </span>
                          {task.completed && (
                            <Badge className="ml-auto bg-green-600">Done</Badge>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No tasks assigned yet</p>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Employee View */}
      {dashboardData.view === 'employee' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Leave Balance</h2>
            <div className="text-4xl font-bold text-blue-600">
              {dashboardData.leave_balance || 0}
            </div>
            <p className="text-sm text-gray-500 mt-2">days remaining</p>
          </Card>
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Pending Expenses</h2>
            <div className="text-4xl font-bold text-orange-600">
              {dashboardData.pending_expenses || 0}
            </div>
            <p className="text-sm text-gray-500 mt-2">awaiting approval</p>
          </Card>
        </div>
      )}

      {/* Manager View */}
      {dashboardData.view === 'manager' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Pending Approvals</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-700">Leave Requests</span>
                <Badge variant="secondary">{dashboardData.pending_leave_approvals || 0}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Expenses</span>
                <Badge variant="secondary">{dashboardData.pending_expense_approvals || 0}</Badge>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Team</h2>
            <div className="text-4xl font-bold text-green-600">
              {dashboardData.team_count || 0}
            </div>
            <p className="text-sm text-gray-500 mt-2">team members</p>
          </Card>
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">My Stats</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Leave Balance</span>
                <span className="font-medium">{dashboardData.leave_balance || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pending Expenses</span>
                <span className="font-medium">{dashboardData.pending_expenses || 0}</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* HR Admin View */}
      {dashboardData.view === 'hr_admin' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Onboarding Pipeline</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">New</span>
                <Badge>{dashboardData.onboarding_pipeline?.new || 0}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">In Progress</span>
                <Badge>{dashboardData.onboarding_pipeline?.in_progress || 0}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Completed</span>
                <Badge>{dashboardData.onboarding_pipeline?.completed || 0}</Badge>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Pending Approvals</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-700">Leave Requests</span>
                <Badge variant="secondary">{dashboardData.pending_leave_approvals || 0}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Expenses</span>
                <Badge variant="secondary">{dashboardData.pending_expense_approvals || 0}</Badge>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Quick Stats</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Team Size</span>
                <span className="font-medium">{dashboardData.team_count || 0}</span>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
