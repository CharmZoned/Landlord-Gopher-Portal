import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { formatDate, formatMoney, formatUnitSize, nextDueDate } from '../lib/format'
import { isOpenStatus } from '../lib/types'
import { usePortal } from '../PortalProvider'

export function Overview() {
  const { profile, lease, requests, error } = usePortal()
  const openCount = requests.filter((request) => isOpenStatus(request.status)).length

  useEffect(() => {
    document.title = 'Overview · Tenant portal'
  }, [])

  return (
    <div className="page">
      <header className="page-header">
        <p className="kicker">Home</p>
        <h1>Overview</h1>
        <p className="lede">
          {profile ? `Hello, ${profile.full_name.split(' ')[0]}.` : 'Your unit, lease, and open requests.'}
        </p>
      </header>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {lease ? (
        <>
          <section className="card">
            <p className="kicker">Your unit</p>
            <h2>Unit {lease.unit.unit_number}</h2>
            <p className="property">{lease.unit.property_name}</p>
            <p>{lease.unit.address_line}</p>
            <p>{lease.unit.city}</p>
            <p className="muted">{formatUnitSize(lease.unit.bedrooms, lease.unit.bathrooms)}</p>
          </section>
          <div className="grid two">
            <section className="card">
              <p className="kicker">Lease</p>
              <dl className="facts">
                <div>
                  <dt>Status</dt>
                  <dd>{lease.status === 'active' ? 'Active' : lease.status}</dd>
                </div>
                <div>
                  <dt>Starts</dt>
                  <dd>{formatDate(lease.start_date)}</dd>
                </div>
                <div>
                  <dt>Ends</dt>
                  <dd>{lease.end_date ? formatDate(lease.end_date) : 'Open'}</dd>
                </div>
              </dl>
            </section>
            <section className="card">
              <p className="kicker">Rent</p>
              <p className="figure">{formatMoney(lease.rent_amount)}</p>
              <p>Next due {formatDate(nextDueDate(lease.due_day))}</p>
              <p className="muted">Monthly rent on this lease.</p>
            </section>
          </div>
          <section className="card">
            <p className="kicker">Maintenance</p>
            <p className="figure">{openCount}</p>
            <p>{openCount === 1 ? 'Open request' : 'Open requests'}</p>
          </section>
          <div className="actions">
            <Link className="button" to="/maintenance">
              Submit a request
            </Link>
            <Link className="button button-secondary" to="/payments">
              Pay rent
            </Link>
          </div>
        </>
      ) : (
        <section className="card">
          <p className="kicker">Your unit</p>
          <h2>No unit on file</h2>
          <p>No active lease is on file for this account.</p>
        </section>
      )}
    </div>
  )
}
