import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let client: SupabaseClient | null = null

const getSupabaseUrl = () =>
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? null

const getServiceRoleKey = () =>
  process.env.SUPABASE_SECRET_KEY ??
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  null

export const getSupabaseAdmin = () => {
  if (client) return client
  const url = getSupabaseUrl()
  const key = getServiceRoleKey()
  if (!url || url.trim() === "/" || !key) {
    throw new Error(
      "Supabase admin env missing (SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY)",
    )
  }
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error("Invalid Supabase URL in env (SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL)")
  }
  if (!/^https?:$/.test(parsed.protocol)) {
    throw new Error("Invalid Supabase URL protocol; expected http/https")
  }
  client = createClient(parsed.toString(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return client
}

