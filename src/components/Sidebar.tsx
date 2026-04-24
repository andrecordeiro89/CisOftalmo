import { NavLink } from 'react-router-dom'
import { LayoutDashboard, UserPlus, ClipboardList, Stethoscope, CalendarDays, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'

const nav = [
  { to: '/paciente',    label: 'Paciente',         icon: UserPlus        },
  { to: '/recepcao',    label: 'Recepção',         icon: LayoutDashboard },
  { to: '/triagem',     label: 'Triagem',          icon: ClipboardList   },
  { to: '/consulta',    label: 'Consulta Médica',  icon: Stethoscope     },
  { to: '/agendamento', label: 'Agendamento',      icon: CalendarDays    },
]

export function Sidebar() {
  return (
    <aside
      className="fixed inset-y-0 left-0 z-30 flex flex-col bg-slate-900 text-white"
      style={{ width: 'var(--sidebar-width)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-slate-700/60">
        <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center shrink-0">
          <Eye size={16} className="text-white" />
        </div>
        <div>
          <p className="font-display font-semibold text-sm leading-tight">OftalmoPro</p>
          <p className="text-slate-400 text-xs">Gestão Clínica</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
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

      {/* Footer */}
      <div className="px-4 py-4 border-t border-slate-700/60">
        <p className="text-slate-500 text-xs">v1.0 — Oftalmologia</p>
      </div>
    </aside>
  )
}
