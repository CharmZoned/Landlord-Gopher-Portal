import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { usePortal } from '../PortalProvider'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { ready, user } = usePortal()
  if (!ready) {
    return (
      <p className="status" role="status">
        Checking session…
      </p>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return children
}
