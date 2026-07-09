import { useCallback, useEffect, useState } from 'react'
import { ClipboardList, Check, UserPlus } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { PageHeader } from '@/components/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface MyTask {
  id: number
  title: string
  status: string
  employee_name: string
}
interface PipelineTask { id: number; title: string; status: string; owner_name: string | null }
interface PipelineRun {
  id: number
  employee_name: string
  status: string
  tasks: PipelineTask[]
}

function taskVariant(status: string): 'pending' | 'blocked' | 'approved' {
  if (status === 'done') return 'approved'
  if (status === 'blocked') return 'blocked'
  return 'pending'
}

function progress(tasks: { status: string }[]) {
  if (!tasks.length) return 0
  return Math.round((100 * tasks.filter((t) => t.status === 'done').length) / tasks.length)
}

export function Onboarding() {
  const { user } = useAuth()
  const isHR = user?.role === 'hr_admin'
  const [myTasks, setMyTasks] = useState<MyTask[]>([])
  const [pipeline, setPipeline] = useState<PipelineRun[]>([])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    try {
      setMyTasks(await api<MyTask[]>('/onboarding/mine'))
      if (isHR) setPipeline(await api<PipelineRun[]>('/onboarding/pipeline'))
    } catch (e) {
      console.error(e)
    }
  }, [isHR])

  useEffect(() => {
    load()
    const id = setInterval(load, 4000)
    return () => clearInterval(id)
  }, [load])

  async function complete(id: number) {
    try {
      await api(`/onboarding/tasks/${id}/complete`, { method: 'POST' })
      load()
    } catch (e: any) {
      setMsg(e?.data?.detail || 'Could not complete task.')
    }
  }

  async function createHire() {
    if (!name || !email) {
      setMsg('Enter a name and email.')
      return
    }
    try {
      const today = new Date().toISOString().slice(0, 10)
      const r = await api<{ id: number }>('/employees/', {
        method: 'POST',
        body: JSON.stringify({
          name, email, password: 'password123', role: 'employee',
          manager_id: 2, join_date: today,
        }),
      })
      setMsg(`Created ${name}. Onboarding started automatically (employee #${r.id}).`)
      setName(''); setEmail('')
      load()
    } catch (e: any) {
      setMsg(e?.data?.detail || 'Could not create employee.')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={ClipboardList} title="Onboarding" subtitle="Tasks assigned to you and, for HR, the full pipeline" />

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-3">My tasks</h2>
        <div className="space-y-2">
          {myTasks.length === 0 && <p className="text-sm text-slate-500">No onboarding tasks assigned to you.</p>}
          {myTasks.map((t) => (
            <div key={t.id} className="flex justify-between items-center border-b border-slate-100 py-2">
              <span className="text-sm">{t.title} <span className="text-slate-400">· for {t.employee_name}</span></span>
              <div className="flex items-center gap-2">
                <Badge variant={taskVariant(t.status)}>{t.status}</Badge>
                {t.status === 'pending' && (
                  <Button size="sm" onClick={() => complete(t.id)}><Check size={16} /></Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {isHR && (
        <>
          <Card className="p-6 space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2"><UserPlus size={18} /> Add a new hire</h2>
            <p className="text-sm text-slate-500">Creating an employee starts their onboarding automatically.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@co.com" />
            </div>
            <Button onClick={createHire} disabled={!name || !email}>Create</Button>
            {msg && <p className="text-sm text-slate-700">{msg}</p>}
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-3">Pipeline</h2>
            <div className="space-y-4">
              {pipeline.length === 0 && <p className="text-sm text-slate-500">No onboarding runs.</p>}
              {pipeline.map((run) => (
                <div key={run.id} className="border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="w-40 font-medium">{run.employee_name}</span>
                    <div className="flex-1 bg-slate-100 rounded h-2">
                      <div className="bg-slate-900 h-2 rounded" style={{ width: `${progress(run.tasks)}%` }} />
                    </div>
                    <span className="text-sm text-slate-500">{progress(run.tasks)}% · {run.status}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {run.tasks.map((t) => (
                      <Badge key={t.id} variant={taskVariant(t.status)}>{t.title}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
