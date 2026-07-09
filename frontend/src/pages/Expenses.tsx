import { useCallback, useEffect, useState } from 'react'
import { Receipt, Check, X, Paperclip } from 'lucide-react'
import { api, getApiBase } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { PageHeader } from '@/components/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface ExpenseRow {
  id: number
  employee_name?: string
  amount: number
  category: string
  description?: string
  receipt_url?: string
  status: string
}

const CATEGORIES = ['Travel', 'Meals', 'Equipment', 'Training', 'Other']

function badgeVariant(status: string): 'pending' | 'approved' | 'rejected' | 'secondary' {
  if (status === 'approved') return 'approved'
  if (status === 'rejected') return 'rejected'
  if (status === 'with_manager' || status === 'with_finance') return 'pending'
  return 'secondary'
}

export function Expenses() {
  const { user } = useAuth()
  const isApprover = user?.role === 'manager' || user?.role === 'hr_admin'
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Travel')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [msg, setMsg] = useState('')
  const [mine, setMine] = useState<ExpenseRow[]>([])
  const [queue, setQueue] = useState<ExpenseRow[]>([])

  const load = useCallback(async () => {
    try {
      setMine(await api<ExpenseRow[]>('/expenses/mine'))
      if (isApprover) setQueue(await api<ExpenseRow[]>('/expenses/queue'))
    } catch (e) {
      console.error(e)
    }
  }, [isApprover])

  useEffect(() => {
    load()
    const id = setInterval(load, 4000)
    return () => clearInterval(id)
  }, [load])

  async function submit() {
    if (!amount || !file) {
      setMsg('Enter an amount and attach a receipt.')
      return
    }
    const fd = new FormData()
    fd.append('amount', amount)
    fd.append('category', category)
    fd.append('description', description)
    fd.append('receipt', file)
    try {
      await api('/expenses/', { method: 'POST', body: fd })
      setMsg('Expense submitted.')
      setAmount(''); setDescription(''); setFile(null)
      load()
    } catch (e: any) {
      setMsg(e?.data?.detail || 'Could not submit expense.')
    }
  }

  async function resolve(id: number, action: 'approve' | 'reject') {
    try {
      await api(`/expenses/${id}/${action}`, { method: 'POST' })
      load()
    } catch (e: any) {
      setMsg(e?.data?.detail || `Could not ${action}.`)
    }
  }

  async function viewReceipt(id: number) {
    try {
      const r = await api<{ receipt_url: string }>(`/expenses/${id}/receipt`)
      window.open(getApiBase() + r.receipt_url, '_blank')
    } catch (e: any) {
      setMsg(e?.data?.detail || 'Could not open receipt.')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={Receipt} title="Expenses" subtitle="Submit claims and track reimbursement" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 space-y-3">
          <h2 className="text-lg font-semibold">Submit an expense</h2>
          <div>
            <label className="text-sm text-slate-600">Amount</label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className="text-sm text-slate-600">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm text-slate-600">Description</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
          </div>
          <div>
            <label className="text-sm text-slate-600 flex items-center gap-1"><Paperclip size={14} /> Receipt</label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="mt-1 text-sm"
            />
          </div>
          <Button onClick={submit} disabled={!amount || !file}>Submit</Button>
          {msg && <p className="text-sm text-slate-700">{msg}</p>}
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-3">My expenses</h2>
          <div className="space-y-2">
            {mine.length === 0 && <p className="text-sm text-slate-500">No expenses yet.</p>}
            {mine.map((e) => (
              <div key={e.id} className="flex justify-between items-center border-b border-slate-100 py-2">
                <span className="text-sm">{e.category} · {e.amount}</span>
                <div className="flex items-center gap-2">
                  {e.receipt_url && (
                    <button className="text-xs underline text-slate-600" onClick={() => viewReceipt(e.id)}>receipt</button>
                  )}
                  <Badge variant={badgeVariant(e.status)}>{e.status.replace('_', ' ')}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {isApprover && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-3">Approval queue</h2>
          <div className="space-y-2">
            {queue.length === 0 && <p className="text-sm text-slate-500">Nothing waiting.</p>}
            {queue.map((e) => (
              <div key={e.id} className="flex justify-between items-center border-b border-slate-100 py-2">
                <span className="text-sm">{e.employee_name} · {e.category} · {e.amount}</span>
                <div className="flex items-center gap-2">
                  {e.receipt_url && (
                    <button className="text-xs underline text-slate-600" onClick={() => viewReceipt(e.id)}>receipt</button>
                  )}
                  <Button size="sm" onClick={() => resolve(e.id, 'approve')}><Check size={16} /></Button>
                  <Button size="sm" variant="destructive" onClick={() => resolve(e.id, 'reject')}><X size={16} /></Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
