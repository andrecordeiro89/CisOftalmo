import { useMemo, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from '@/components/Sidebar'
import { ToastProvider } from '@/lib/toast'
import { LayoutProvider } from '@/lib/layout'
import { AuthProvider, useAuth } from '@/lib/auth'
import { Recepcao } from '@/pages/Recepcao'
import { Paciente } from '@/pages/Paciente'
import { Triagem } from '@/pages/Triagem'
import { Consulta } from '@/pages/Consulta'
import { Agendamento } from '@/pages/Agendamento'
import { Cirurgico } from '@/pages/Cirurgico'
import { Login } from '@/pages/Login'

function ProtectedShell({
  sidebarOpen,
  onCloseSidebar,
}: {
  sidebarOpen: boolean
  onCloseSidebar: () => void
}) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center text-slate-400">
        Carregando…
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return (
    <div className="flex min-h-dvh overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={onCloseSidebar} />
      <main className="flex-1 overflow-hidden md:ml-[var(--sidebar-width)]">
        <Outlet />
      </main>
    </div>
  )
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const layoutValue = useMemo(
    () => ({
      sidebarOpen,
      openSidebar: () => setSidebarOpen(true),
      closeSidebar: () => setSidebarOpen(false),
    }),
    [sidebarOpen]
  )

  return (
    <AuthProvider>
      <ToastProvider>
        <LayoutProvider value={layoutValue}>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                element={
                  <ProtectedShell
                    sidebarOpen={sidebarOpen}
                    onCloseSidebar={() => setSidebarOpen(false)}
                  />
                }
              >
                <Route path="/"              element={<Navigate to="/paciente" replace />} />
                <Route path="/recepcao"      element={<Recepcao />} />
                <Route path="/paciente"      element={<Paciente />} />
                <Route path="/triagem"       element={<Triagem />} />
                <Route path="/consulta"      element={<Consulta />} />
                <Route path="/agendamento"   element={<Agendamento />} />
                <Route path="/cirurgico"     element={<Cirurgico />} />
              </Route>
              <Route path="*" element={<Navigate to="/paciente" replace />} />
            </Routes>
          </BrowserRouter>
        </LayoutProvider>
      </ToastProvider>
    </AuthProvider>
  )
}
