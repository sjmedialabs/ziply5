import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let client: SupabaseClient | null = null

const getSupabaseUrl = () =>
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? null

const getAnonKey = () =>
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? null

export const getSupabaseServer = () => {
  if (client) return client
  const url = getSupabaseUrl()
  const key = getAnonKey()
  if (!url || url.trim() === "/" || !key) {
    throw new Error("Supabase server env missing (NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL + SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)")
  }
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error("Invalid Supabase URL in env (NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL)")
  }
  if (!/^https?:$/.test(parsed.protocol)) {
    throw new Error("Invalid Supabase URL protocol; expected http/https")
  }
  client = createClient(parsed.toString(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return client
}

