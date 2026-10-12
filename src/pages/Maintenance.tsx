import { useEffect, useState, type FormEvent } from 'react'
import { formatDate } from '../lib/format'
import {
  CATEGORIES,
  LOCATIONS,
  URGENCIES,
  categoryLabel,
  statusLabel,
  urgencyLabel,
  type RequestCategory,
  type RequestUrgency,
} from '../lib/types'
import { usePortal } from '../PortalProvider'

export function Maintenance() {
  const { lease, requests, error, createRequest } = usePortal()
  const [category, setCategory] = useState<RequestCategory>('plumbing')
  const [location, setLocation] = useState('Kitchen')
  const [description, setDescription] = useState('')
  const [urgency, setUrgency] = useState<RequestUrgency>('normal')
  const [permission, setPermission] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    document.title = 'Maintenance · Tenant portal'
  }, [])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    setNotice(null)
    if (!description.trim()) {
      setFormError('Describe the problem.')
      return
    }
    setPending(true)
    const message = await createRequest({
      category,
      location,
      description,
      urgency,
      permission_to_enter: permission,
    })
    setPending(false)
    if (message) {
      setFormError(message)
      return
    }
    setDescription('')
    setPermission(false)
    setUrgency('normal')
    setNotice('Request submitted.')
  }

  return (
    <div className="page">
      <header className="page-header">
        <p className="kicker">Maintenance</p>
        <h1>Request</h1>
        <p className="lede">Tell us what needs attention in your unit.</p>
      </header>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {lease ? (
        <form className="card stack" onSubmit={(event) => void onSubmit(event)}>
          <p className="muted">
            {lease.unit.property_name} · Unit {lease.unit.unit_number}
          </p>
          <label>
            Category
            <select
              name="category"
              value={category}
              onChange={(event) => setCategory(event.target.value as RequestCategory)}
            >
              {CATEGORIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Where in the unit
            <select name="location" value={location} onChange={(event) => setLocation(event.target.value)}>
              {LOCATIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            What needs attention
            <textarea
              name="description"
              rows={5}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={2000}
              required
            />
          </label>
          <fieldset>
            <legend>Urgency</legend>
            <div className="choices">
              {URGENCIES.map((item) => (
                <label key={item.value} className="choice">
                  <input
                    type="radio"
                    name="urgency"
                    value={item.value}
                    checked={urgency === item.value}
                    onChange={() => setUrgency(item.value)}
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="choice">
            <input
              type="checkbox"
              name="permission"
              checked={permission}
              onChange={(event) => setPermission(event.target.checked)}
            />
            Permission to enter if I am not home
          </label>
          {formError ? (
            <p className="form-error" role="alert">
              {formError}
            </p>
          ) : null}
          {notice ? (
            <p className="note" role="status">
              {notice}
            </p>
          ) : null}
          <button type="submit" className="button" disabled={pending}>
            {pending ? 'Submitting…' : 'Submit request'}
          </button>
        </form>
      ) : (
        <section className="card">
          <h2>No unit on file</h2>
          <p>No active lease is on file, so a request cannot be filed yet.</p>
        </section>
      )}

      <section className="stack">
        <h2>Your requests</h2>
        {requests.length === 0 ? (
          <p className="card">No requests yet.</p>
        ) : (
          <ul className="request-list">
            {requests.map((request) => (
              <li key={request.id} className="card request">
                <div className="request-top">
                  <span className="pill">{statusLabel(request.status)}</span>
                  <span className="muted">{formatDate(request.created_at)}</span>
                </div>
                <h3>
                  {categoryLabel(request.category)}
                  {request.location ? ` · ${request.location}` : ''} · {urgencyLabel(request.urgency)}
                </h3>
                <p>{request.description}</p>
                <p className="muted">
                  Permission to enter: {request.permission_to_enter ? 'Yes' : 'No'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
