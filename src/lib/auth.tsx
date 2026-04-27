import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

type AuthContextValue = {
  loading: boolean
  session: Session | null
  user: User | null
  signInWithPassword: (params: { email: string; password: string }) => Promise<{ ok: boolean; message?: string }>
  sendPasswordResetEmail: (params: { email: string }) => Promise<{ ok: boolean; message?: string }>
  updatePassword: (params: { password: string }) => Promise<{ ok: boolean; message?: string }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return
      if (!error) setSession(data.session ?? null)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      session,
      user: session?.user ?? null,
      signInWithPassword: async ({ email, password }) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) return { ok: false, message: error.message }
        return { ok: true }
      },
      sendPasswordResetEmail: async ({ email }) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email)
        if (error) return { ok: false, message: error.message }
        return { ok: true }
      },
      updatePassword: async ({ password }) => {
        const { error } = await supabase.auth.updateUser({ password })
        if (error) return { ok: false, message: error.message }
        return { ok: true }
      },
      signOut: async () => {
        await supabase.auth.signOut()
      },
    }),
    [loading, session]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
