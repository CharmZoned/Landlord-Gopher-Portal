import type {
  Lease,
  MaintenanceRequest,
  NewRequest,
  PortalApi,
  PortalData,
  Profile,
  SessionUser,
} from './types'

export const DEMO_EMAIL = 'tenant@example.com'
export const DEMO_PASSWORD = 'wireframe-demo'

const DEMO_USER_ID = '11111111-1111-4111-8111-111111111111'
const DEMO_UNIT_ID = '22222222-2222-4222-8222-222222222222'
const DEMO_LEASE_ID = '33333333-3333-4333-8333-333333333333'
const SESSION_KEY = 'tenant-portal-session'
const REQUESTS_KEY = 'tenant-portal-requests'

const demoProfile: Profile = {
  id: DEMO_USER_ID,
  full_name: 'Jordan Hale',
  phone: '(512) 555-0148',
  email: DEMO_EMAIL,
}

const demoLease: Lease = {
  id: DEMO_LEASE_ID,
  unit_id: DEMO_UNIT_ID,
  rent_amount: 1850,
  due_day: 1,
  start_date: '2025-06-01',
  end_date: '2026-05-31',
  status: 'active',
  unit: {
    id: DEMO_UNIT_ID,
    property_name: 'Oak Court Apartments',
    address_line: '1840 Oak Court',
    city: 'Austin, TX 78702',
    unit_number: '4B',
    bedrooms: 2,
    bathrooms: 1,
  },
}

function sampleRequest(): MaintenanceRequest {
  return {
    id: '44444444-4444-4444-8444-444444444444',
    category: 'plumbing',
    location: 'Kitchen',
    description: 'The kitchen faucet drips after it is turned off.',
    urgency: 'normal',
    permission_to_enter: true,
    status: 'submitted',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  }
}

function readSession(): SessionUser | null {
  const raw = sessionStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as SessionUser
    if (parsed.userId !== DEMO_USER_ID) return null
    return parsed
  } catch {
    return null
  }
}

function readRequests(): MaintenanceRequest[] {
  const raw = sessionStorage.getItem(REQUESTS_KEY)
  if (!raw) {
    const initial = [sampleRequest()]
    sessionStorage.setItem(REQUESTS_KEY, JSON.stringify(initial))
    return initial
  }
  try {
    const parsed = JSON.parse(raw) as MaintenanceRequest[]
    return Array.isArray(parsed) ? parsed : [sampleRequest()]
  } catch {
    return [sampleRequest()]
  }
}

export function createDemoPortal(): PortalApi {
  const listeners = new Set<() => void>()

  const notify = () => {
    for (const listener of listeners) listener()
  }

  return {
    async signIn(email, password) {
      const normalized = email.trim().toLowerCase()
      if (!normalized || !password) return 'Enter your email and password.'
      if (normalized !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
        return 'Email or password is incorrect.'
      }
      const session: SessionUser = { userId: DEMO_USER_ID, email: DEMO_EMAIL }
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
      notify()
      return null
    },

    async signOut() {
      sessionStorage.removeItem(SESSION_KEY)
      notify()
    },

    async getSession() {
      return readSession()
    },

    onAuthChange(callback) {
      listeners.add(callback)
      callback()
      return () => listeners.delete(callback)
    },

    async load(user): Promise<PortalData> {
      if (user.userId !== DEMO_USER_ID) {
        return { profile: null, lease: null, requests: [], error: 'Unknown tenant.' }
      }
      return {
        profile: { ...demoProfile, email: user.email },
        lease: demoLease,
        requests: readRequests().sort((a, b) => b.created_at.localeCompare(a.created_at)),
        error: null,
      }
    },

    async createRequest(user, input: NewRequest) {
      if (user.userId !== DEMO_USER_ID) return 'Sign in before submitting a request.'
      const description = input.description.trim()
      if (!description) return 'Describe the problem.'
      const request: MaintenanceRequest = {
        id: crypto.randomUUID(),
        category: input.category,
        location: input.location.trim() || null,
        description,
        urgency: input.urgency,
        permission_to_enter: input.permission_to_enter,
        status: 'submitted',
        created_at: new Date().toISOString(),
      }
      const next = [request, ...readRequests()]
      sessionStorage.setItem(REQUESTS_KEY, JSON.stringify(next))
      return null
    },
  }
}
