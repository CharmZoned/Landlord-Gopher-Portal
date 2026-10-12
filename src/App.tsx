import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { RequireAuth } from './components/RequireAuth'
import { Login } from './pages/Login'
import { Maintenance } from './pages/Maintenance'
import { Overview } from './pages/Overview'
import { Payments } from './pages/Payments'

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<Overview />} />
        <Route path="maintenance" element={<Maintenance />} />
        <Route path="payments" element={<Payments />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
