type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE"

export async function apiRequest<T>(path: string, method: HttpMethod, body?: unknown, accessToken?: string): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const payload = await response.json()
  if (!response.ok) {
    throw new Error(payload?.message ?? "Request failed")
  }
  return payload as T
}
