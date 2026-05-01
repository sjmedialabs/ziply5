import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { env } from "@/src/server/core/config/env"

let client: SupabaseClient | null = null

/** supabase-js expects the project origin only; `/rest/v1` is appended internally. */
function normalizeSupabaseProjectOrigin(raw: string): string {
  return raw
    .trim()
    .replace(/\/rest\/v1\/?$/i, "")
    .replace(/\/+$/, "")
}

/** When only DATABASE_URL was updated after a migration, derive https://<ref>.supabase.co from common Supabase Postgres URLs. */
function inferSupabaseProjectUrlFromDatabaseUrl(databaseUrl: string): string | null {
  if (!databaseUrl || !databaseUrl.toLowerCase().includes("supabase")) return null
  try {
    const normalized = databaseUrl.replace(/^postgresql:/i, "http:").replace(/^postgres:/i, "http:")
    const u = new URL(normalized)
    const user = decodeURIComponent(u.username || "")
    const userRef = /^postgres\.([^:]+)$/i.exec(user)
    if (userRef?.[1]) return `https://${userRef[1]}.supabase.co`
    const dbHost = /^db\.([^.]+)\.supabase\.co$/i.exec(u.hostname)
    if (dbHost?.[1]) return `https://${dbHost[1]}.supabase.co`
  } catch {
    return null
  }
  return null
}

const getSupabaseUrl = (): string | null => {
  const explicit =
    (env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)?.trim() ?? ""
  if (explicit && explicit !== "/") return explicit
  return inferSupabaseProjectUrlFromDatabaseUrl(env.DATABASE_URL)
}

const getServiceRoleKey = () =>
  process.env.SUPABASE_SECRET_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY ?? null

export const getSupabaseAdmin = () => {
  if (client) return client
  const url = getSupabaseUrl()
  const key = getServiceRoleKey()
  if (!url || url.trim() === "/" || !key) {
    const parts: string[] = []
    if (!url || url.trim() === "/") {
      parts.push(
        "Supabase project URL: set SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL (https://<project-ref>.supabase.co), or use a Supabase DATABASE_URL so the URL can be inferred from the postgres username.",
      )
    }
    if (!key) {
      parts.push(
        "Service role key: set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY from Supabase Dashboard → Project Settings → API (secret service_role key).",
      )
    }
    throw new Error(parts.join(" "))
  }
  const origin = normalizeSupabaseProjectOrigin(url)
  let parsed: URL
  try {
    parsed = new URL(origin)
  } catch {
    throw new Error("Invalid Supabase URL in env (SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL)")
  }
  if (!/^https?:$/.test(parsed.protocol)) {
    throw new Error("Invalid Supabase URL protocol; expected http/https")
  }
  client = createClient(parsed.origin, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return client
}

