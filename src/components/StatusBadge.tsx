import { VISIT_STATUS_LABELS, VISIT_STATUS_COLORS, type VisitStatus } from '@/types'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: VisitStatus
  className?: string
}

const dotColors: Record<VisitStatus, string> = {
  recepcao:               'bg-slate-400',
  triagem:                'bg-amber-400',
  aguardando_consulta:    'bg-brand-400',
  em_consulta:            'bg-purple-400',
  finalizado:             'bg-emerald-400',
  aguardando_agendamento: 'bg-red-400',
  agendado:               'bg-emerald-400',
  presente_cirurgia:      'bg-teal-400',
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={cn(VISIT_STATUS_COLORS[status], className)}>
      <span className={cn('status-dot', dotColors[status])} />
      {VISIT_STATUS_LABELS[status]}
    </span>
  )
}
