import { LucideIcon } from 'lucide-react'

export function PageHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: LucideIcon
  title: string
  subtitle: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-lg bg-slate-900 text-white p-2">
        <Icon size={22} />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="text-slate-600 mt-0.5">{subtitle}</p>
      </div>
    </div>
  )
}
