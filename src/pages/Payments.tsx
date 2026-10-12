import { useEffect } from 'react'
import { formatDate, formatMoney, nextDueDate } from '../lib/format'
import { usePortal } from '../PortalProvider'

export function Payments() {
  const { lease, error } = usePortal()

  useEffect(() => {
    document.title = 'Pay rent · Tenant portal'
  }, [])

  return (
    <div className="page">
      <header className="page-header">
        <p className="kicker">Rent</p>
        <h1>Pay rent</h1>
        <p className="lede">Online payment is not part of this portal yet.</p>
      </header>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {lease ? (
        <section className="card">
          <p className="kicker">Amount due</p>
          <p className="figure">{formatMoney(lease.rent_amount)}</p>
          <dl className="facts">
            <div>
              <dt>Due</dt>
              <dd>{formatDate(nextDueDate(lease.due_day))}</dd>
            </div>
            <div>
              <dt>Unit</dt>
              <dd>
                {lease.unit.property_name} · {lease.unit.unit_number}
              </dd>
            </div>
          </dl>
          <p className="muted">Monthly rent on this lease. Nothing has been charged.</p>
        </section>
      ) : (
        <section className="card">
          <h2>No rent on file</h2>
          <p>No active lease is on file for this account.</p>
        </section>
      )}
      <section className="coming-soon" aria-labelledby="coming-soon-title">
        <p className="kicker">Coming soon</p>
        <h2 id="coming-soon-title">Online rent payment</h2>
        <p>Pay rent from this portal is coming soon. This screen does not take a payment.</p>
        <button type="button" className="button" disabled aria-disabled="true">
          Pay now
        </button>
      </section>
    </div>
  )
}
