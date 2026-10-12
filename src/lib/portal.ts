import { createDemoPortal } from './demoPortal'
import { createSupabasePortal } from './supabasePortal'
import type { PortalApi } from './types'

export const PROJECT_URL = 'https://bgjkjtfgrfiszbzatriq.supabase.co'

export type PortalMode = 'demo' | 'supabase'

export function createPortal(): { api: PortalApi; mode: PortalMode } {
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
  const url = import.meta.env.VITE_SUPABASE_URL?.trim() || PROJECT_URL
  const forceDemo = import.meta.env.VITE_DATA_SOURCE === 'demo'
  if (forceDemo || !key) {
    return { api: createDemoPortal(), mode: 'demo' }
  }
  return { api: createSupabasePortal(url, key), mode: 'supabase' }
}
