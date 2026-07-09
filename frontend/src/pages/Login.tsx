import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/lib/auth'

const DEMO_ACCOUNTS = [
  { email: 'maya@co.com', role: 'manager' },
  { email: 'admin@co.com', role: 'hr_admin' },
  { email: 'raj@co.com', role: 'employee' },
  { email: 'newbie@co.com', role: 'new_hire' },
]

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('password123')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError('Login failed. Please check your credentials.')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickLogin = async (demoEmail: string) => {
    setEmail(demoEmail)
    setError('')
    setIsLoading(true)

    try {
      await login(demoEmail, 'password123')
      navigate('/dashboard')
    } catch (err) {
      setError('Login failed. Please check your credentials.')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md p-8 shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900">PeopleOS</h1>
          <p className="text-gray-600 mt-2">Human Resource Management System</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 mb-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password123"
              required
              disabled={isLoading}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !email}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
        </form>

        <div className="mb-6">
          <p className="text-xs text-gray-500 text-center mb-3 uppercase tracking-wide">
            Demo Credentials
          </p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <Button
                key={account.email}
                variant="outline"
                size="sm"
                onClick={() => handleQuickLogin(account.email)}
                disabled={isLoading}
                className="text-xs h-8"
              >
                <div className="text-left">
                  <div className="font-medium">{account.email.split('@')[0]}</div>
                  <div className="text-xs text-gray-500">{account.role}</div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        <div className="text-center text-xs text-gray-500">
          <p>Password: <code className="bg-gray-100 px-2 py-1 rounded">password123</code></p>
        </div>
      </Card>
    </div>
  )
}
