import { NavLink } from 'react-router-dom'
import { LayoutDashboard, UserPlus, ClipboardList, Stethoscope, CalendarDays, Eye, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const nav = [
  { to: '/paciente',    label: 'Paciente',         icon: UserPlus        },
  { to: '/recepcao',    label: 'Recepção',         icon: LayoutDashboard },
  { to: '/triagem',     label: 'Triagem',          icon: ClipboardList   },
  { to: '/consulta',    label: 'Consulta Médica',  icon: Stethoscope     },
  { to: '/agendamento', label: 'Agendamento',      icon: CalendarDays    },
]

export function Sidebar({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  return (
    <>
      {open && (
        <button
          type="button"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          aria-label="Fechar menu"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-slate-900 text-white',
          'w-72 md:w-[var(--sidebar-width)]',
          'transition-transform duration-200',
          open ? 'translate-x-0' : '-translate-x-full',
          'md:translate-x-0'
        )}
      >
        <div className="flex items-center gap-2.5 px-4 py-5 border-b border-slate-700/60">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center shrink-0">
            <Eye size={16} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="font-display font-semibold text-sm leading-tight">OftalmoPro</p>
            <p className="text-slate-400 text-xs">Gestão Clínica</p>
          </div>
          <button onClick={onClose} className="btn-ghost p-2 text-white/90 hover:text-white md:hidden" aria-label="Fechar menu">
            <X size={16} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )
              }
            >
              <Icon size={16} className="shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-slate-700/60">
          <p className="text-slate-500 text-xs">v1.0 — Oftalmologia</p>
        </div>
      </aside>
    </>
  )
}
