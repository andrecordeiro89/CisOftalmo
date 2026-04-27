import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail, RefreshCw } from 'lucide-react'
import { useToast } from '@/lib/toast'
import { useAuth } from '@/lib/auth'

type Mode = 'login' | 'reset'

export function Login() {
  const { toast } = useToast()
  const { user, loading, signInWithPassword, sendPasswordResetEmail } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const redirectTo = useMemo(() => {
    const state = location.state as { from?: { pathname?: string } } | null
    return state?.from?.pathname ?? '/paciente'
  }, [location.state])

  useEffect(() => {
    if (!loading && user) navigate(redirectTo, { replace: true })
  }, [loading, user, navigate, redirectTo])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) { toast('Informe seu email', 'error'); return }

    setSubmitting(true)
    try {
      if (mode === 'reset') {
        const res = await sendPasswordResetEmail({ email: cleanEmail })
        if (!res.ok) {
          toast(res.message || 'Não foi possível enviar o email de recuperação', 'error')
          return
        }
        toast('Email de recuperação enviado (se a conta existir)', 'success')
        setMode('login')
        return
      }

      if (!password) { toast('Informe sua senha', 'error'); return }
      const res = await signInWithPassword({ email: cleanEmail, password })
      if (!res.ok) {
        toast(res.message || 'Email ou senha inválidos', 'error')
        return
      }
      toast('Login realizado', 'success')
      navigate(redirectTo, { replace: true })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 py-10 bg-slate-50">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-brand-600 flex items-center justify-center shadow-sm">
            <span className="text-white font-display font-semibold text-lg">OP</span>
          </div>
          <h1 className="mt-4 font-display text-2xl font-semibold text-slate-900">OftalmoPro</h1>
          <p className="text-sm text-slate-500">Acesso seguro à plataforma clínica</p>
        </div>

        <div className="card p-6 sm:p-7">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="font-display font-semibold text-slate-900">
                {mode === 'login' ? 'Entrar' : 'Recuperar acesso'}
              </p>
              <p className="text-xs text-slate-500">
                {mode === 'login'
                  ? 'Use seu email e senha para acessar.'
                  : 'Enviaremos um email para redefinir sua senha.'}
              </p>
            </div>
            {loading && <RefreshCw size={16} className="text-slate-400 animate-spin" />}
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="seuemail@empresa.com"
                />
              </div>
            </div>

            {mode === 'login' && (
              <div>
                <label className="label">Senha</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="input pl-10 pr-11"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 btn-ghost p-2 min-h-0"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="btn-primary justify-center"
              disabled={submitting}
            >
              {submitting && <RefreshCw size={14} className="animate-spin" />}
              {mode === 'login' ? 'Entrar' : 'Enviar email de recuperação'}
            </button>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => setMode(m => (m === 'login' ? 'reset' : 'login'))}
                className="text-brand-700 hover:text-brand-800 font-medium"
              >
                {mode === 'login' ? 'Esqueci minha senha' : 'Voltar para login'}
              </button>
              <p className="text-xs text-slate-400">v1.0</p>
            </div>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Ao entrar, você concorda com as políticas internas de acesso e auditoria.
        </p>
      </div>
    </div>
  )
}
