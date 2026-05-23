interface StatusBadgeProps {
  status: string
}

const STATUS_STYLES: Record<string, string> = {
  Logged: 'bg-slate-100 text-slate-700',
  Received: 'bg-slate-100 text-slate-700',
  Ready: 'bg-amber-100 text-amber-800',
  Pending: 'bg-amber-100 text-amber-800',
  Collected: 'bg-emerald-100 text-emerald-800',
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-700'
      }`}
    >
      {status}
    </span>
  )
}
