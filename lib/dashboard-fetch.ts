import { authFetch } from "@/lib/auth-session"
import { clearSession } from "@/lib/auth-session"

export type ApiEnvelope<T> = {
  success: boolean
  message?: string
  data?: T
  details?: unknown
}

export async function authedFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await authFetch(path, init)

  // Admin UX: if session is missing/expired, redirect to the correct login page
  // instead of spamming 401 errors and leaving the UI in a broken state.
  if (typeof window !== "undefined" && res.status === 401) {
    const isAdmin = window.location.pathname.startsWith("/admin")
    clearSession({ silent: true })
    window.location.href = isAdmin ? "/admin/login" : "/login"
    throw new Error("Unauthorized")
  }

  let json: ApiEnvelope<T> = { success: false, message: "Invalid response" }
  try {
    json = (await res.json()) as ApiEnvelope<T>
  } catch {
    json = { success: false, message: `HTTP ${res.status} (non-JSON)` }
  }

  if (!res.ok || json.success === false) {
    const msg = json.message ?? `Request failed (${res.status})`
    const extra =
      json.details != null && typeof json.details === "object"
        ? ` — ${JSON.stringify(json.details).slice(0, 2000)}`
        : ""
    throw new Error(msg + extra)
  }
  if (json.data === undefined) throw new Error("Empty data in response")
  return json.data
}

export async function authedPost<T>(path: string, body: unknown): Promise<T> {
  return authedFetch<T>(path, { method: "POST", body: JSON.stringify(body) })
}

export async function authedPut<T>(path: string, body: unknown): Promise<T> {
  return authedFetch<T>(path, { method: "PUT", body: JSON.stringify(body) })
}

export async function authedPatch<T>(path: string, body: unknown): Promise<T> {
  return authedFetch<T>(path, { method: "PATCH", body: JSON.stringify(body) })
}

export async function authedDelete<T>(path: string): Promise<T> {
  return authedFetch<T>(path, { method: "DELETE" })
}
