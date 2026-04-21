import { authFetch } from "@/lib/auth-session"

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE"

export async function apiRequest<T>(path: string, method: HttpMethod, body?: unknown, accessToken?: string): Promise<T> {
  const response = accessToken
    ? await fetch(path, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      })
    : await authFetch(path, {
        method,
        body: body ? JSON.stringify(body) : undefined,
      })

  const payload = await response.json()
  if (!response.ok) {
    throw new Error(payload?.message ?? "Request failed")
  }
  return payload as T
}
