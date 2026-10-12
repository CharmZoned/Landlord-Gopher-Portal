import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { DEMO_EMAIL, DEMO_PASSWORD } from '../lib/demoPortal'
import { usePortal } from '../PortalProvider'

export function Login() {
  const { ready, user, mode, signIn } = usePortal()
  const navigate = useNavigate()
  const [email, setEmail] = useState(mode === 'demo' ? DEMO_EMAIL : '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    document.title = 'Sign in · Tenant portal'
  }, [])

  if (ready && user) return <Navigate to="/" replace />

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    const message = await signIn(email, password)
    setPending(false)
    if (message) {
      setError(message)
      return
    }
    navigate('/')
  }

  return (
    <div className="login-screen">
      <form className="card login-card" onSubmit={(event) => void onSubmit(event)}>
        <p className="kicker">Wireframe</p>
        <h1>Sign in</h1>
        <p className="lede">Property maintenance portal for your unit.</p>
        {mode === 'demo' ? (
          <p className="note">
            Preview data is on because the Supabase publishable key is not set. Sample tenant:{' '}
            {DEMO_EMAIL} / {DEMO_PASSWORD}. Adding the key in .env uses project bgjkjtfgrfiszbzatriq.
          </p>
        ) : null}
        <label>
          Email
          <input
            type="email"
            name="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className="button" disabled={pending || !ready}>
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
