import { Link, useNavigate, Outlet } from 'react-router-dom'
import { LogOut, Home, CalendarDays, Receipt, ClipboardList } from 'lucide-react'
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-gray-700 hover:text-blue-600 transition"
              >
                <Home size={16} />
                <span className="font-medium">Dashboard</span>
              </Link>
              <Link
                to="/leave"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-gray-700 hover:text-blue-600 transition"
              >
                <CalendarDays size={16} />
                <span className="font-medium">Leave</span>
              </Link>
              <Link
                to="/expenses"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-gray-700 hover:text-blue-600 transition"
              >
                <Receipt size={16} />
                <span className="font-medium">Expenses</span>
              </Link>
              <Link
                to="/onboarding"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-gray-700 hover:text-blue-600 transition"
              >
                <ClipboardList size={16} />
                <span className="font-medium">Onboarding</span>
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
