export function nextDueDate(dueDay: number, from = new Date()): Date {
  const day = Math.min(Math.max(Math.trunc(dueDay), 1), 28)
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  let due = new Date(from.getFullYear(), from.getMonth(), day)
  if (due < today) {
    due = new Date(from.getFullYear(), from.getMonth() + 1, day)
  }
  return due
}

export function parseDate(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day)
  }
  return new Date(value)
}

export function formatDate(value: Date | string): string {
  const date = typeof value === 'string' ? parseDate(value) : value
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function formatUnitSize(bedrooms: number | null, bathrooms: number | null): string {
  const beds = bedrooms == null ? 'Beds not listed' : `${bedrooms} bed`
  const baths = bathrooms == null ? 'Baths not listed' : `${Number(bathrooms)} bath`
  return `${beds} · ${baths}`
}

export function friendlyDataError(message: string): string {
  if (/schema cache|does not exist|could not find the table|PGRST/i.test(message)) {
    return 'The tenant tables are not available yet. Apply supabase/schema.sql in the Supabase SQL editor, then try again.'
  }
  return message
}
