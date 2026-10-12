export type RequestCategory =
  | 'plumbing'
  | 'electrical'
  | 'hvac'
  | 'appliance'
  | 'pest'
  | 'other'

export type RequestUrgency = 'low' | 'normal' | 'urgent'

export type RequestStatus = 'submitted' | 'in_progress' | 'completed' | 'cancelled'

export type SessionUser = {
  userId: string
  email: string
}

export type Profile = {
  id: string
  full_name: string
  phone: string | null
  email: string
}

export type Unit = {
  id: string
  property_name: string
  address_line: string
  city: string
  unit_number: string
  bedrooms: number | null
  bathrooms: number | null
}

export type Lease = {
  id: string
  unit_id: string
  rent_amount: number
  due_day: number
  start_date: string
  end_date: string | null
  status: string
  unit: Unit
}

export type MaintenanceRequest = {
  id: string
  category: RequestCategory
  location: string | null
  description: string
  urgency: RequestUrgency
  permission_to_enter: boolean
  status: RequestStatus
  created_at: string
}

export type NewRequest = {
  category: RequestCategory
  location: string
  description: string
  urgency: RequestUrgency
  permission_to_enter: boolean
}

export type PortalData = {
  profile: Profile | null
  lease: Lease | null
  requests: MaintenanceRequest[]
  error: string | null
}

export type PortalApi = {
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
  getSession: () => Promise<SessionUser | null>
  onAuthChange: (callback: () => void) => () => void
  load: (user: SessionUser) => Promise<PortalData>
  createRequest: (user: SessionUser, input: NewRequest) => Promise<string | null>
}

export const CATEGORIES: { value: RequestCategory; label: string }[] = [
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'appliance', label: 'Appliance' },
  { value: 'pest', label: 'Pest' },
  { value: 'other', label: 'Other' },
]

export const LOCATIONS = ['Kitchen', 'Bathroom', 'Bedroom', 'Living room', 'Hallway', 'Other']

export const URGENCIES: { value: RequestUrgency; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'urgent', label: 'Urgent' },
]

const CATEGORY_LABELS = Object.fromEntries(CATEGORIES.map((item) => [item.value, item.label]))
const URGENCY_LABELS = Object.fromEntries(URGENCIES.map((item) => [item.value, item.label]))

const STATUS_LABELS: Record<RequestStatus, string> = {
  submitted: 'Submitted',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export function categoryLabel(value: RequestCategory): string {
  return CATEGORY_LABELS[value] ?? value
}

export function urgencyLabel(value: RequestUrgency): string {
  return URGENCY_LABELS[value] ?? value
}

export function statusLabel(value: RequestStatus): string {
  return STATUS_LABELS[value] ?? value
}

export function isOpenStatus(status: RequestStatus): boolean {
  return status === 'submitted' || status === 'in_progress'
}

export function isCategory(value: string): value is RequestCategory {
  return CATEGORIES.some((item) => item.value === value)
}

export function isUrgency(value: string): value is RequestUrgency {
  return URGENCIES.some((item) => item.value === value)
}

export function isStatus(value: string): value is RequestStatus {
  return value in STATUS_LABELS
}
