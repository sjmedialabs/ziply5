export type ApiEnvelope<T> = {
  success: boolean
  message?: string
  data?: T
  details?: unknown
}

export async function authedFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? window.localStorage.getItem("ziply5_access_token") : null
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  })

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
        ? ` — ${JSON.stringify(json.details).slice(0, 200)}`
        : ""
    throw new Error(msg + extra)
  }
  if (json.data === undefined) throw new Error("Empty data in response")
  return json.data
}

export async function authedPost<T>(path: string, body: unknown): Promise<T> {
  return authedFetch<T>(path, { method: "POST", body: JSON.stringify(body) })
}

export async function authedPatch<T>(path: string, body: unknown): Promise<T> {
  return authedFetch<T>(path, { method: "PATCH", body: JSON.stringify(body) })
}

export async function authedDelete<T>(path: string): Promise<T> {
  return authedFetch<T>(path, { method: "DELETE" })
}
