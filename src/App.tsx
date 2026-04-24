import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Sidebar } from '@/components/Sidebar'
import { ToastProvider } from '@/lib/toast'
import { Recepcao } from '@/pages/Recepcao'
import { Triagem } from '@/pages/Triagem'
import { Consulta } from '@/pages/Consulta'
import { Agendamento } from '@/pages/Agendamento'

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main
            className="flex-1 overflow-hidden"
            style={{ marginLeft: 'var(--sidebar-width)' }}
          >
            <Routes>
              <Route path="/"              element={<Navigate to="/recepcao" replace />} />
              <Route path="/recepcao"      element={<Recepcao />} />
              <Route path="/triagem"       element={<Triagem />} />
              <Route path="/consulta"      element={<Consulta />} />
              <Route path="/agendamento"   element={<Agendamento />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ToastProvider>
  )
}
