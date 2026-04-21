"use client"

import { toast } from "@/lib/toast"
import { getSupabaseRealtimeClient } from "@/lib/supabase-realtime"

const ACCESS_KEY = "ziply5_access_token"
const REFRESH_KEY = "ziply5_refresh_token"
const ROLE_KEY = "ziply5_user_role"
const USER_KEY = "ziply5_user"
const REFRESH_SKEW_SEC = 90
const AUTO_REFRESH_INTERVAL_MS = 60_000

type StoredSession = {
  accessToken: string | null
  refreshToken: string | null
  role: string | null
}

type RefreshPayload = {
  accessToken: string
}

let refreshInFlight: Promise<string | null> | null = null
let refreshCooldownUntil = 0
let initializedAutoRefresh = false
let restoreFetch: (() => void) | null = null

const parseJwtExp = (token: string | null) => {
  if (!token) return 0
  try {
    const parts = token.split(".")
    if (parts.length < 2) return 0
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const decoded = JSON.parse(atob(payload)) as { exp?: number }
    return Number(decoded.exp ?? 0)
  } catch {
    return 0
  }
}

const isAccessTokenNearExpiry = (token: string | null) => {
  const exp = parseJwtExp(token)
  if (!exp) return true
  const now = Math.floor(Date.now() / 1000)
  return exp - now <= REFRESH_SKEW_SEC
}

export const getStoredSession = (): StoredSession => {
  if (typeof window === "undefined") {
    return { accessToken: null, refreshToken: null, role: null }
  }
  return {
    accessToken: window.localStorage.getItem(ACCESS_KEY),
    refreshToken: window.localStorage.getItem(REFRESH_KEY),
    role: window.localStorage.getItem(ROLE_KEY),
  }
}

export const persistSession = (input: {
  accessToken: string
  refreshToken: string
  role?: string | null
  user?: unknown
}) => {
  if (typeof window === "undefined") return
  window.localStorage.setItem(ACCESS_KEY, input.accessToken)
  window.localStorage.setItem(REFRESH_KEY, input.refreshToken)
  if (input.role) window.localStorage.setItem(ROLE_KEY, input.role)
  if (input.user !== undefined) window.localStorage.setItem(USER_KEY, JSON.stringify(input.user))
  window.dispatchEvent(new Event("storage"))
}

export const clearSession = (opts?: { silent?: boolean; redirectToLogin?: boolean }) => {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(ACCESS_KEY)
  window.localStorage.removeItem(REFRESH_KEY)
  window.localStorage.removeItem(ROLE_KEY)
  window.localStorage.removeItem(USER_KEY)
  window.dispatchEvent(new Event("storage"))
  if (!opts?.silent) {
    toast.error("Session expired", "Please login again.")
  }
  if (opts?.redirectToLogin) {
    window.location.assign("/login")
  }
}

const refreshAccessTokenInternal = async (refreshToken: string) => {
  const response = await fetch("/api/v1/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  })
  const payload = (await response.json()) as {
    success?: boolean
    message?: string
    data?: RefreshPayload
  }
  if (!response.ok || !payload.success || !payload.data?.accessToken) {
    throw new Error(payload.message ?? "Unable to refresh session")
  }
  window.localStorage.setItem(ACCESS_KEY, payload.data.accessToken)
  window.dispatchEvent(new Event("storage"))
  window.dispatchEvent(new CustomEvent("ziply5:auth-state-change", { detail: { event: "TOKEN_REFRESHED" } }))
  return payload.data.accessToken
}

export const refreshAccessToken = async () => {
  if (typeof window === "undefined") return null
  const now = Date.now()
  if (now < refreshCooldownUntil) return null
  if (refreshInFlight) return refreshInFlight

  const { refreshToken } = getStoredSession()
  if (!refreshToken) return null

  refreshInFlight = refreshAccessTokenInternal(refreshToken)
    .catch(() => {
      refreshCooldownUntil = Date.now() + 3000
      clearSession({ redirectToLogin: true })
      return null
    })
    .finally(() => {
      refreshInFlight = null
    })
  return refreshInFlight
}

export const getValidAccessToken = async () => {
  const { accessToken, refreshToken } = getStoredSession()
  if (!accessToken && refreshToken) {
    return refreshAccessToken()
  }
  if (isAccessTokenNearExpiry(accessToken)) {
    const refreshed = await refreshAccessToken()
    return refreshed ?? accessToken
  }
  return accessToken
}

export const authFetch = async (path: string, init?: RequestInit) => {
  const token = await getValidAccessToken()
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  })

  if (response.status !== 401) return response

  const refreshed = await refreshAccessToken()
  if (!refreshed) return response
  return fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${refreshed}`,
      ...(init?.headers ?? {}),
    },
  })
}

export const initSessionAutoRefresh = () => {
  if (typeof window === "undefined" || initializedAutoRefresh) return
  initializedAutoRefresh = true

  const tick = () => {
    const { refreshToken } = getStoredSession()
    if (!refreshToken) return
    void getValidAccessToken()
  }

  const intervalId = window.setInterval(tick, AUTO_REFRESH_INTERVAL_MS)
  const onFocus = () => tick()
  const onVisibility = () => {
    if (!document.hidden) tick()
  }

  window.addEventListener("focus", onFocus)
  document.addEventListener("visibilitychange", onVisibility)

  const supabase = getSupabaseRealtimeClient()
  const supaSub = supabase?.auth.onAuthStateChange((event) => {
    if (event === "TOKEN_REFRESHED") {
      void tick()
    }
  })

  tick()

  return () => {
    window.clearInterval(intervalId)
    window.removeEventListener("focus", onFocus)
    document.removeEventListener("visibilitychange", onVisibility)
    supaSub?.data.subscription.unsubscribe()
    initializedAutoRefresh = false
  }
}

const isApiRequest = (input: RequestInfo | URL) => {
  if (typeof input === "string") return input.startsWith("/api/")
  if (input instanceof URL) return input.pathname.startsWith("/api/")
  return input.url.startsWith("/api/")
}

const getRequestPath = (input: RequestInfo | URL) => {
  if (typeof input === "string") return input
  if (input instanceof URL) return input.pathname
  return input.url
}

const shouldBypassInterceptor = (input: RequestInfo | URL) => {
  const path = getRequestPath(input)
  return path.includes("/api/v1/auth/refresh") || path.includes("/api/v1/auth/logout")
}

export const installGlobalApiInterceptor = () => {
  if (typeof window === "undefined" || restoreFetch) return
  const nativeFetch = window.fetch.bind(window)

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    if (!isApiRequest(input) || shouldBypassInterceptor(input)) {
      return nativeFetch(input, init)
    }

    const requestedHeaders = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined))
    const hasAuthHeader = requestedHeaders.has("Authorization")
    if (!hasAuthHeader) {
      const token = await getValidAccessToken()
      if (token) requestedHeaders.set("Authorization", `Bearer ${token}`)
    }
    const isFormData =
      typeof FormData !== "undefined" &&
      init?.body &&
      (init.body instanceof FormData ||
        Object.prototype.toString.call(init.body) === "[object FormData]")

    if (!requestedHeaders.has("Content-Type") && init?.body != null && !isFormData) {
      requestedHeaders.set("Content-Type", "application/json")
    }

    const response = await nativeFetch(input, {
      ...init,
      headers: requestedHeaders,
    })
    if (response.status !== 401) {
      return response
    }

    const refreshed = await refreshAccessToken()
    if (!refreshed) return response

    const retryHeaders = new Headers(requestedHeaders)
    retryHeaders.set("Authorization", `Bearer ${refreshed}`)
    retryHeaders.set("x-ziply5-retry", "1")
    return nativeFetch(input, {
      ...init,
      headers: retryHeaders,
    })
  }

  restoreFetch = () => {
    window.fetch = nativeFetch
    restoreFetch = null
  }
}

export const uninstallGlobalApiInterceptor = () => {
  restoreFetch?.()
}
