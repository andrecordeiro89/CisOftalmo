import React, { createContext, useContext, useState, useCallback } from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  const remove = (id: string) => setToasts(prev => prev.filter(t => t.id !== id))

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`
              flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg pointer-events-auto
              animate-slide-up max-w-sm border
              ${t.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : ''}
              ${t.type === 'error'   ? 'bg-red-50 border-red-200 text-red-800'             : ''}
              ${t.type === 'info'    ? 'bg-brand-50 border-brand-200 text-brand-800'        : ''}
            `}
          >
            {t.type === 'success' && <CheckCircle size={16} className="mt-0.5 shrink-0" />}
            {t.type === 'error'   && <AlertCircle size={16} className="mt-0.5 shrink-0" />}
            {t.type === 'info'    && <Info         size={16} className="mt-0.5 shrink-0" />}
            <p className="text-sm flex-1">{t.message}</p>
            <button onClick={() => remove(t.id)} className="opacity-60 hover:opacity-100 shrink-0">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
