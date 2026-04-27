import { useId } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export function CollapsibleSection({
  title,
  open,
  onToggle,
  children,
  className,
  headerClassName,
  contentClassName,
}: {
  title: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
  className?: string
  headerClassName?: string
  contentClassName?: string
}) {
  const id = useId()

  return (
    <section className={cn('rounded-xl border border-slate-200 bg-white', className)}>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'w-full flex items-center justify-between gap-3 px-4 py-3 text-left',
          headerClassName
        )}
        aria-expanded={open}
        aria-controls={id}
      >
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
          {title}
        </span>
        {open ? (
          <ChevronDown size={16} className="text-slate-400 shrink-0" />
        ) : (
          <ChevronRight size={16} className="text-slate-400 shrink-0" />
        )}
      </button>
      {open && (
        <div id={id} className={cn('px-4 pb-4', contentClassName)}>
          {children}
        </div>
      )}
    </section>
  )
}
