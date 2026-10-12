import { NavLink, Outlet } from 'react-router-dom'
import { usePortal } from '../PortalProvider'

export function AppShell() {
  const { profile, lease, user, signOut } = usePortal()
  const name = profile?.full_name || user?.email || 'Tenant'
  const unitLabel = lease
    ? `${lease.unit.property_name} · Unit ${lease.unit.unit_number}`
    : 'No unit on file'

  return (
    <div className="shell">
      <aside className="shell-side">
        <p className="kicker">Wireframe</p>
        <p className="brand">Tenant portal</p>
        <p className="tenant-name">{name}</p>
        {user?.email ? <p className="muted">{user.email}</p> : null}
        {profile?.phone ? <p className="muted">{profile.phone}</p> : null}
        {lease ? (
          <>
            <p className="unit-label">{lease.unit.property_name}</p>
            <p className="unit-label">Unit {lease.unit.unit_number}</p>
          </>
        ) : (
          <p className="unit-label">{unitLabel}</p>
        )}
        <nav className="nav" aria-label="Portal">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            Overview
          </NavLink>
          <NavLink
            to="/maintenance"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            Maintenance
          </NavLink>
          <NavLink
            to="/payments"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            Pay rent
          </NavLink>
        </nav>
        <button type="button" className="button button-secondary logout" onClick={() => void signOut()}>
          Log out
        </button>
      </aside>
      <main className="shell-main">
        <Outlet />
      </main>
    </div>
  )
}
