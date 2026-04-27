import React, { createContext, useContext } from 'react'

type LayoutContextValue = {
  sidebarOpen: boolean
  openSidebar: () => void
  closeSidebar: () => void
}

const LayoutContext = createContext<LayoutContextValue | null>(null)

export function LayoutProvider({
  value,
  children,
}: {
  value: LayoutContextValue
  children: React.ReactNode
}) {
  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
}

export function useLayout() {
  const ctx = useContext(LayoutContext)
  if (!ctx) throw new Error('useLayout must be used within LayoutProvider')
  return ctx
}
