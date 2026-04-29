import { useMemo, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, UserPlus, ClipboardList, Stethoscope, CalendarDays, Eye, X, LogOut, Settings, KeyRound, RefreshCw, Scissors } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import { useToast } from '@/lib/toast'

const nav = [
  { to: '/paciente',    label: 'Paciente',         icon: UserPlus        },
  { to: '/recepcao',    label: 'Recepção',         icon: LayoutDashboard },
  { to: '/triagem',     label: 'Triagem',          icon: ClipboardList   },
  { to: '/consulta',    label: 'Consulta Médica',  icon: Stethoscope     },
  { to: '/cirurgico',   label: 'Cirúrgico',        icon: Scissors        },
  { to: '/agendamento', label: 'Agendamento',      icon: CalendarDays    },
]

export function Sidebar({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { toast } = useToast()
  const { user, signOut, updatePassword } = useAuth()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const initials = useMemo(() => {
    const email = user?.email ?? ''
    const base = email.split('@')[0] ?? ''
    if (!base) return 'U'
    const parts = base.replace(/[^a-zA-Z0-9]+/g, ' ').trim().split(' ').filter(Boolean)
    const a = parts[0]?.[0] ?? base[0]
    const b = parts[1]?.[0] ?? parts[0]?.[1] ?? ''
    return (a + b).toUpperCase()
  }, [user?.email])

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
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700/60">
                <span className="text-xs font-semibold text-slate-200">{initials}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-slate-200 text-sm font-medium leading-tight">Conta</p>
                <p className="text-slate-400 text-xs truncate">{user?.email ?? ''}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Dialog.Root open={settingsOpen} onOpenChange={setSettingsOpen}>
                <Dialog.Trigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-800 transition-colors min-h-[44px]"
                  >
                    <Settings size={16} />
                    Senha
                  </button>
                </Dialog.Trigger>

                <Dialog.Portal>
                  <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
                  <Dialog.Content
                    className={cn(
                      'fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
                      'w-[92vw] max-w-md rounded-2xl bg-white border border-slate-200 shadow-xl'
                    )}
                  >
                    <div className="p-5 border-b border-slate-100 flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0 border border-brand-200">
                        <KeyRound size={18} className="text-brand-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Dialog.Title className="font-display font-semibold text-slate-900">
                          Alterar senha
                        </Dialog.Title>
                        <Dialog.Description className="text-xs text-slate-500">
                          Defina uma nova senha para a sua conta.
                        </Dialog.Description>
                      </div>
                      <Dialog.Close asChild>
                        <button className="btn-ghost p-2 min-h-0" aria-label="Fechar">
                          <X size={16} />
                        </button>
                      </Dialog.Close>
                    </div>

                    <form
                      className="p-5 flex flex-col gap-4"
                      onSubmit={async e => {
                        e.preventDefault()
                        const p = password.trim()
                        if (p.length < 6) { toast('A senha deve ter no mínimo 6 caracteres', 'error'); return }
                        if (p !== confirmPassword.trim()) { toast('As senhas não conferem', 'error'); return }
                        setSaving(true)
                        try {
                          const res = await updatePassword({ password: p })
                          if (!res.ok) {
                            toast(res.message || 'Não foi possível atualizar a senha', 'error')
                            return
                          }
                          toast('Senha atualizada com sucesso', 'success')
                          setPassword('')
                          setConfirmPassword('')
                          setSettingsOpen(false)
                        } finally {
                          setSaving(false)
                        }
                      }}
                    >
                      <div>
                        <label className="label">Nova senha</label>
                        <input
                          className="input"
                          type="password"
                          autoComplete="new-password"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          placeholder="Digite a nova senha"
                        />
                      </div>
                      <div>
                        <label className="label">Confirmar nova senha</label>
                        <input
                          className="input"
                          type="password"
                          autoComplete="new-password"
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          placeholder="Repita a nova senha"
                        />
                      </div>

                      <div className="flex items-center gap-2 justify-end pt-1">
                        <Dialog.Close asChild>
                          <button type="button" className="btn-secondary">
                            Cancelar
                          </button>
                        </Dialog.Close>
                        <button type="submit" className="btn-primary" disabled={saving}>
                          {saving && <RefreshCw size={14} className="animate-spin" />}
                          Salvar
                        </button>
                      </div>
                    </form>
                  </Dialog.Content>
                </Dialog.Portal>
              </Dialog.Root>

              <button
                type="button"
                onClick={async () => {
                  await signOut()
                  onClose()
                }}
                className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-800 transition-colors min-h-[44px]"
              >
                <LogOut size={16} />
                Sair
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
