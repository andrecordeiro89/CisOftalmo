import { cn } from '@/lib/utils'

export function MobileActionBar({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'md:hidden sticky bottom-0 z-20 bg-white/95 backdrop-blur border-t border-slate-200',
        'px-4 py-3 safe-bottom',
        className
      )}
    >
      {children}
    </div>
  )
}
