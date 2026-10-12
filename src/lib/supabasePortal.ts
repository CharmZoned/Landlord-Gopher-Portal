import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { friendlyDataError } from './format'
import {
  isCategory,
  isStatus,
  isUrgency,
  type Lease,
  type MaintenanceRequest,
  type NewRequest,
  type PortalApi,
  type PortalData,
  type Profile,
  type SessionUser,
  type Unit,
} from './types'

type LeaseRow = {
  id: string
  unit_id: string
  rent_amount: number | string
  due_day: number
  start_date: string
  end_date: string | null
  status: string
  units: Unit | Unit[] | null
}

function firstError(...messages: Array<string | undefined>): string | null {
  const message = messages.find(Boolean)
  return message ? friendlyDataError(message) : null
}

function asUnit(value: Unit | Unit[] | null): Unit | null {
  const row = Array.isArray(value) ? value[0] : value
  if (!row) return null
  return {
    id: row.id,
    property_name: row.property_name,
    address_line: row.address_line,
    city: row.city,
    unit_number: row.unit_number,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms == null ? null : Number(row.bathrooms),
  }
}

function asLease(row: LeaseRow | null): Lease | null {
  if (!row) return null
  const unit = asUnit(row.units)
  if (!unit) return null
  return {
    id: row.id,
    unit_id: row.unit_id,
    rent_amount: Number(row.rent_amount),
    due_day: row.due_day,
    start_date: row.start_date,
    end_date: row.end_date,
    status: row.status,
    unit,
  }
}

function asRequest(row: {
  id: string
  category: string
  location: string | null
  description: string
  urgency: string
  permission_to_enter: boolean
  status: string
  created_at: string
}): MaintenanceRequest | null {
  if (!isCategory(row.category) || !isUrgency(row.urgency) || !isStatus(row.status)) return null
  return {
    id: row.id,
    category: row.category,
    location: row.location,
    description: row.description,
    urgency: row.urgency,
    permission_to_enter: row.permission_to_enter,
    status: row.status,
    created_at: row.created_at,
  }
}

export function createSupabasePortal(url: string, anonKey: string): PortalApi {
  const supabase: SupabaseClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  })

  return {
    async signIn(email, password) {
      const normalized = email.trim()
      if (!normalized || !password) return 'Enter your email and password.'
      const { error } = await supabase.auth.signInWithPassword({
        email: normalized,
        password,
      })
      if (!error) return null
      if (/invalid login/i.test(error.message)) return 'Email or password is incorrect.'
      return error.message
    },

    async signOut() {
      await supabase.auth.signOut()
    },

    async getSession() {
      const { data } = await supabase.auth.getSession()
      const user = data.session?.user
      if (!user) return null
      return { userId: user.id, email: user.email ?? '' }
    },

    onAuthChange(callback) {
      const { data } = supabase.auth.onAuthStateChange(() => {
        callback()
      })
      return () => data.subscription.unsubscribe()
    },

    async load(user): Promise<PortalData> {
      const [profileRes, leaseRes, requestRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, phone')
          .eq('id', user.userId)
          .maybeSingle(),
        supabase
          .from('leases')
          .select(
            `id, unit_id, rent_amount, due_day, start_date, end_date, status,
             units (id, property_name, address_line, city, unit_number, bedrooms, bathrooms)`,
          )
          .eq('tenant_id', user.userId)
          .eq('status', 'active')
          .maybeSingle(),
        supabase
          .from('maintenance_requests')
          .select(
            'id, category, location, description, urgency, permission_to_enter, status, created_at',
          )
          .eq('tenant_id', user.userId)
          .order('created_at', { ascending: false }),
      ])

      const error = firstError(
        profileRes.error?.message,
        leaseRes.error?.message,
        requestRes.error?.message,
      )

      const profileRow = profileRes.data as Pick<Profile, 'id' | 'full_name' | 'phone'> | null
      const profile: Profile | null = profileRow
        ? { ...profileRow, email: user.email }
        : null

      const requests = ((requestRes.data ?? []) as Array<{
        id: string
        category: string
        location: string | null
        description: string
        urgency: string
        permission_to_enter: boolean
        status: string
        created_at: string
      }>)
        .map(asRequest)
        .filter((row): row is MaintenanceRequest => row !== null)

      return {
        profile,
        lease: asLease(leaseRes.data as LeaseRow | null),
        requests,
        error,
      }
    },

    async createRequest(user: SessionUser, input: NewRequest) {
      const loaded = await this.load(user)
      if (!loaded.lease) return 'No active lease is on file, so a request cannot be filed yet.'
      const description = input.description.trim()
      const location = input.location.trim()
      if (!description) return 'Describe the problem.'

      const { error } = await supabase.from('maintenance_requests').insert({
        tenant_id: user.userId,
        unit_id: loaded.lease.unit_id,
        category: input.category,
        location: location || null,
        description,
        urgency: input.urgency,
        permission_to_enter: input.permission_to_enter,
        status: 'submitted',
      })

      return error ? friendlyDataError(error.message) : null
    },
  }
}
