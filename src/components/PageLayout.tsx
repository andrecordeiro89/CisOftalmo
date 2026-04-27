import { Menu } from 'lucide-react'
import { useLayout } from '@/lib/layout'

interface PageLayoutProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  children: React.ReactNode
}

export function PageLayout({ title, subtitle, actions, children }: PageLayoutProps) {
  const { openSidebar } = useLayout()
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 lg:px-8 py-4 sm:py-5 bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-start gap-3">
          <button onClick={openSidebar} className="btn-ghost p-2 md:hidden" aria-label="Abrir menu">
            <Menu size={18} />
          </button>
          <div>
            <h1 className="font-display font-semibold text-xl text-slate-900">{title}</h1>
            {subtitle && <p className="text-slate-500 text-sm mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 scrollbar-thin">
        {children}
      </main>
    </div>
  )
}
