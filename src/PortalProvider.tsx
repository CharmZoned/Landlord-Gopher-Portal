import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { createPortal, type PortalMode } from './lib/portal'
import type { Lease, MaintenanceRequest, NewRequest, Profile, SessionUser } from './lib/types'

type PortalContextValue = {
  ready: boolean
  mode: PortalMode
  user: SessionUser | null
  profile: Profile | null
  lease: Lease | null
  requests: MaintenanceRequest[]
  error: string | null
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
  createRequest: (input: NewRequest) => Promise<string | null>
}

const PortalContext = createContext<PortalContextValue | null>(null)
const portal = createPortal()

const empty = {
  user: null as SessionUser | null,
  profile: null as Profile | null,
  lease: null as Lease | null,
  requests: [] as MaintenanceRequest[],
  error: null as string | null,
}

export function PortalProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [data, setData] = useState(empty)

  useEffect(() => {
    const alive = { current: true }

    async function refresh() {
      const session = await portal.api.getSession()
      if (!alive.current) return
      if (!session) {
        setData(empty)
        setReady(true)
        return
      }
      const loaded = await portal.api.load(session)
      if (!alive.current) return
      setData({
        user: session,
        profile: loaded.profile,
        lease: loaded.lease,
        requests: loaded.requests,
        error: loaded.error,
      })
      setReady(true)
    }

    const unsubscribe = portal.api.onAuthChange(() => {
      void refresh()
    })

    return () => {
      alive.current = false
      unsubscribe()
    }
  }, [])

  const value = useMemo<PortalContextValue>(
    () => ({
      ready,
      mode: portal.mode,
      user: data.user,
      profile: data.profile,
      lease: data.lease,
      requests: data.requests,
      error: data.error,
      async signIn(email, password) {
        const error = await portal.api.signIn(email, password)
        if (error) return error
        const session = await portal.api.getSession()
        if (!session) return 'Sign-in did not start a session.'
        const loaded = await portal.api.load(session)
        setData({
          user: session,
          profile: loaded.profile,
          lease: loaded.lease,
          requests: loaded.requests,
          error: loaded.error,
        })
        setReady(true)
        return null
      },
      async signOut() {
        await portal.api.signOut()
        setData(empty)
        setReady(true)
      },
      async createRequest(input) {
        if (!data.user) return 'Sign in before submitting a request.'
        const error = await portal.api.createRequest(data.user, input)
        if (error) return error
        const loaded = await portal.api.load(data.user)
        setData((current) => ({
          ...current,
          requests: loaded.requests,
          error: loaded.error,
        }))
        return null
      },
    }),
    [ready, data],
  )

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>
}

export function usePortal(): PortalContextValue {
  const value = useContext(PortalContext)
  if (!value) throw new Error('usePortal must be used inside PortalProvider')
  return value
}
