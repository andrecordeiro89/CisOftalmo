import { useMemo, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Sidebar } from '@/components/Sidebar'
import { ToastProvider } from '@/lib/toast'
import { LayoutProvider } from '@/lib/layout'
import { Recepcao } from '@/pages/Recepcao'
import { Paciente } from '@/pages/Paciente'
import { Triagem } from '@/pages/Triagem'
import { Consulta } from '@/pages/Consulta'
import { Agendamento } from '@/pages/Agendamento'

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
    <ToastProvider>
      <LayoutProvider value={layoutValue}>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <div className="flex min-h-dvh overflow-hidden">
            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <main className="flex-1 overflow-hidden md:ml-[var(--sidebar-width)]">
              <Routes>
                <Route path="/"              element={<Navigate to="/paciente" replace />} />
                <Route path="/recepcao"      element={<Recepcao />} />
                <Route path="/paciente"      element={<Paciente />} />
                <Route path="/triagem"       element={<Triagem />} />
                <Route path="/consulta"      element={<Consulta />} />
                <Route path="/agendamento"   element={<Agendamento />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </LayoutProvider>
    </ToastProvider>
  )
}
