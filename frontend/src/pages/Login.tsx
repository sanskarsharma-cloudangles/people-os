import { useState } from 'react'
import { Building2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(email, password)
    } catch {
      setError('Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:flex flex-col items-center justify-center bg-indigo-50 p-10">
        <img src="/illustrations/peep-standing-1.svg" alt="" className="w-80 h-80" />
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 text-center mt-8 max-w-sm leading-tight">
          HR that comes to you.
        </h1>
        <p className="text-slate-600 text-center mt-4 max-w-xs text-lg">
          Leave, expenses, and onboarding in one place. No forms to chase.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center p-6">
        <Card className="w-full max-w-sm p-8">
          <div className="flex items-center gap-2 mb-8">
            <div className="rounded-lg bg-slate-900 text-white p-2"><Building2 size={22} /></div>
            <span className="text-2xl font-bold">PeopleOS</span>
          </div>
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-slate-900">Sign in</h1>
            <p className="text-sm text-slate-500 mt-1">Welcome back. Enter your details to continue.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="mt-1" required />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Password</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="mt-1" required />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </Card>
        <p className="text-xs text-slate-400 mt-6">PeopleOS · Codebenders AI Hackathon 2026</p>
      </div>
    </div>
  )
}
