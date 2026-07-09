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
        <img src="/illustrations/peep-standing-1.svg" alt="" className="w-64 h-64" />
        <h2 className="text-xl font-semibold text-slate-800 mt-6">Your workday, sorted.</h2>
        <p className="text-slate-600 text-center mt-2 max-w-xs">
          Leave, expenses, and onboarding in one place. No forms to chase.
        </p>
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-sm p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="rounded-lg bg-slate-900 text-white p-2"><Building2 size={22} /></div>
            <span className="text-2xl font-bold">PeopleOS</span>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-sm text-slate-600">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required />
            </div>
            <div>
              <label className="text-sm text-slate-600">Password</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
