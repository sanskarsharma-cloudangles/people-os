import { Link, useNavigate, Outlet } from 'react-router-dom'
import { LogOut, Home, Calendar, DollarSign, CheckSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'
import { NotificationBell } from './NotificationBell'

export function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-8">
            <Link to="/dashboard" className="text-2xl font-bold text-blue-600">
              PeopleOS
            </Link>

            {/* Navigation Links */}
            <nav className="flex items-center gap-6">
              <Link
                to="/dashboard"
                className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition"
              >
                <Home className="h-4 w-4" />
                <span className="text-sm font-medium">Dashboard</span>
              </Link>
              <Link
                to="/leave"
                className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition"
              >
                <Calendar className="h-4 w-4" />
                <span className="text-sm font-medium">Leave</span>
              </Link>
              <Link
                to="/expenses"
                className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition"
              >
                <DollarSign className="h-4 w-4" />
                <span className="text-sm font-medium">Expenses</span>
              </Link>
              <Link
                to="/onboarding"
                className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition"
              >
                <CheckSquare className="h-4 w-4" />
                <span className="text-sm font-medium">Onboarding</span>
              </Link>
            </nav>
          </div>

          {/* Right side - Notifications, User info, Logout */}
          <div className="flex items-center gap-4">
            <NotificationBell />

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.name || user?.email}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              title="Logout"
            >
              <LogOut className="h-5 w-5 text-red-600" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
