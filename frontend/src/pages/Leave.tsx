import { useCallback, useEffect, useState } from 'react'
import { CalendarDays, Check, X } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { PageHeader } from '@/components/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface LeaveRow {
  id: number
  leave_type: string
  start_date: string
  end_date: string
  days: number
  status: string
  employee_name?: string
}

const LEAVE_TYPES = ['casual', 'earned', 'sick']

function daysBetween(start: string, end: string) {
  const a = new Date(start).getTime()
  const b = new Date(end).getTime()
  if (isNaN(a) || isNaN(b) || b < a) return 0
  return Math.round((b - a) / 86400000) + 1
}

function badgeVariant(status: string): 'pending' | 'approved' | 'rejected' {
  if (status === 'approved') return 'approved'
  if (status === 'rejected') return 'rejected'
  return 'pending'
}

export function Leave() {
  const { user } = useAuth()
  const isApprover = user?.role === 'manager' || user?.role === 'hr_admin'
  const [leaveType, setLeaveType] = useState('casual')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [msg, setMsg] = useState('')
  const [mine, setMine] = useState<LeaveRow[]>([])
  const [team, setTeam] = useState<LeaveRow[]>([])

  const load = useCallback(async () => {
    try {
      setMine(await api<LeaveRow[]>('/leave/mine'))
      if (isApprover) setTeam(await api<LeaveRow[]>('/leave/team'))
    } catch (e) {
      console.error(e)
    }
  }, [isApprover])

  useEffect(() => {
    load()
    const id = setInterval(load, 4000)
    return () => clearInterval(id)
  }, [load])

  const days = daysBetween(start, end)

  async function apply() {
    if (!start || !end || days <= 0) {
      setMsg('Pick a valid start and end date.')
      return
    }
    try {
      await api('/leave/', {
        method: 'POST',
        body: JSON.stringify({ leave_type: leaveType, start_date: start, end_date: end, days }),
      })
      setMsg(`Applied for ${days} day(s) of ${leaveType} leave. Waiting for approval.`)
      setStart(''); setEnd('')
      load()
    } catch (e: any) {
      setMsg(e?.data?.detail || 'Could not apply for leave.')
    }
  }

  async function resolve(id: number, action: 'approve' | 'reject') {
    try {
      await api(`/leave/${id}/${action}`, { method: 'POST' })
      load()
    } catch (e: any) {
      setMsg(e?.data?.detail || `Could not ${action}.`)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={CalendarDays} title="Leave" subtitle="Apply for time off and track approvals" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 space-y-3">
          <h2 className="text-lg font-semibold">Apply for leave</h2>
          <div>
            <label className="text-sm text-slate-600">Type</label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm capitalize"
            >
              {LEAVE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-600">Start</label>
              <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-slate-600">End</label>
              <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          {days > 0 && <p className="text-sm text-slate-500">{days} day(s)</p>}
          <Button onClick={apply} disabled={!start || !end}>Confirm</Button>
          {msg && <p className="text-sm text-slate-700">{msg}</p>}
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-3">My requests</h2>
          <div className="space-y-2">
            {mine.length === 0 && <p className="text-sm text-slate-500">No requests yet.</p>}
            {mine.map((l) => (
              <div key={l.id} className="flex justify-between items-center border-b border-slate-100 py-2">
                <span className="text-sm">{l.start_date} to {l.end_date} · {l.leave_type} · {l.days}d</span>
                <Badge variant={badgeVariant(l.status)}>{l.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {isApprover && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-3">Team leave</h2>
          <div className="space-y-2">
            {team.length === 0 && <p className="text-sm text-slate-500">No approved team leave.</p>}
            {team.map((l) => (
              <div key={l.id} className="flex justify-between items-center border-b border-slate-100 py-2">
                <span className="text-sm">{l.employee_name} · {l.start_date} to {l.end_date} · {l.leave_type}</span>
                <Badge variant="approved">approved</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
