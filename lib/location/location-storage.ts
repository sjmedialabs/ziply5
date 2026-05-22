import { LOCATION_CACHE_PREFIX, LOCATION_PROMPT_SKIP_PREFIX } from "@/lib/location/constants"

export function getUserId(): string | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem("ziply5_user")
    if (!raw) return null
    const id = JSON.parse(raw).id
    return id != null ? String(id) : null
  } catch {
    return null
  }
}

export function getLocationCacheKey(): string {
  const userId = getUserId()
  return userId ? `${LOCATION_CACHE_PREFIX}-${userId}` : `${LOCATION_CACHE_PREFIX}-guest`
}

export function getPromptSkipKey(): string {
  const userId = getUserId()
  return userId ? `${LOCATION_PROMPT_SKIP_PREFIX}-${userId}` : `${LOCATION_PROMPT_SKIP_PREFIX}-guest`
}

export function getCachedLocation(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(getLocationCacheKey())
}

export function setCachedLocation(label: string): void {
  if (typeof window === "undefined") return
  localStorage.setItem(getLocationCacheKey(), label)
}

export function isLocationPromptSkipped(): boolean {
  if (typeof window === "undefined") return false
  return sessionStorage.getItem(getPromptSkipKey()) === "1"
}

export function setLocationPromptSkipped(skipped: boolean): void {
  if (typeof window === "undefined") return
  const key = getPromptSkipKey()
  if (skipped) sessionStorage.setItem(key, "1")
  else sessionStorage.removeItem(key)
}
