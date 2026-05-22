import { GEO_TIMEOUT_MS } from "@/lib/location/constants"
import { isGeolocationSupported, isSecureGeolocationContext } from "@/lib/location/permission.service"

export type GeolocationErrorCode =
  | "DENIED"
  | "UNAVAILABLE"
  | "TIMEOUT"
  | "UNSUPPORTED"
  | "INSECURE"
  | "REVERSE_GEOCODE_FAILED"
  | "EMPTY_COORDS"

export type GeolocationSuccess = {
  ok: true
  label: string
  latitude: number
  longitude: number
}

export type GeolocationFailure = {
  ok: false
  code: GeolocationErrorCode
  message: string
}

export type GeolocationResult = GeolocationSuccess | GeolocationFailure

export async function reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
    )
    if (!res.ok) return null
    const data = await res.json()
    const area = data.locality || data.city || ""
    const region = data.principalSubdivision || ""
    if (!area && !region) return null
    return region ? `${area}, ${region}` : area
  } catch {
    return null
  }
}

export function getCurrentLocation(options?: { highAccuracy?: boolean }): Promise<GeolocationResult> {
  return new Promise((resolve) => {
    if (!isSecureGeolocationContext()) {
      resolve({
        ok: false,
        code: "INSECURE",
        message: "Location requires a secure connection (HTTPS).",
      })
      return
    }
    if (!isGeolocationSupported()) {
      resolve({
        ok: false,
        code: "UNSUPPORTED",
        message: "Your browser does not support location detection.",
      })
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          resolve({
            ok: false,
            code: "EMPTY_COORDS",
            message: "Could not read your coordinates. Please try again.",
          })
          return
        }
        const label = await reverseGeocode(latitude, longitude)
        if (!label) {
          resolve({
            ok: false,
            code: "REVERSE_GEOCODE_FAILED",
            message: "Could not resolve your city from GPS. Please try again.",
          })
          return
        }
        resolve({ ok: true, label, latitude, longitude })
      },
      (error) => {
        if (error?.code === 1) {
          resolve({
            ok: false,
            code: "DENIED",
            message: "Location access was denied.",
          })
          return
        }
        if (error?.code === 3) {
          resolve({
            ok: false,
            code: "TIMEOUT",
            message: "Location request timed out. Please try again.",
          })
          return
        }
        resolve({
          ok: false,
          code: "UNAVAILABLE",
          message: "Location is unavailable on this device.",
        })
      },
      {
        enableHighAccuracy: options?.highAccuracy ?? true,
        timeout: GEO_TIMEOUT_MS,
        maximumAge: 0,
      },
    )
  })
}

export type FallbackSource = "cache" | "address" | "ip"

export async function fetchLoggedInSavedLocation(): Promise<string | null> {
  if (typeof window === "undefined") return null
  const token = localStorage.getItem("ziply5_access_token")
  if (!token) return null
  try {
    const res = await fetch("/api/v1/me/addresses", {
      headers: { Authorization: `Bearer ${token}` },
    })
    const json = await res.json()
    if (!json?.success || !Array.isArray(json.data) || json.data.length === 0) return null
    const addr = json.data.find((a: { isDefault?: boolean }) => a.isDefault) ?? json.data[0]
    const city = String(addr?.city ?? "").trim()
    const state = String(addr?.state ?? "").trim()
    if (!city) return null
    return state ? `${city}, ${state}` : city
  } catch {
    return null
  }
}

/** When GPS is blocked, resolve city from cache → saved address → IP. */
export async function resolveFallbackLocation(
  cached?: string | null,
): Promise<{ label: string; source: FallbackSource } | null> {
  const fromCache = cached?.trim()
  if (fromCache) return { label: fromCache, source: "cache" }

  const saved = await fetchLoggedInSavedLocation()
  if (saved) return { label: saved, source: "address" }

  const ip = await fetchIpApproxLocation()
  if (ip) return { label: ip, source: "ip" }

  return null
}

export async function fetchIpApproxLocation(): Promise<string | null> {
  try {
    let res = await fetch("https://freeipapi.com/api/json/")
    if (res.ok) {
      const data = await res.json()
      if (data.cityName) {
        return data.regionName ? `${data.cityName}, ${data.regionName}` : data.cityName
      }
    }
    res = await fetch("https://ipapi.co/json/")
    if (res.ok) {
      const data = await res.json()
      if (data.city) {
        return data.region ? `${data.city}, ${data.region}` : data.city
      }
    }
  } catch {
    /* try server-side fallback */
  }

  try {
    const res = await fetch("/api/geo/approximate")
    const json = await res.json()
    if (json?.success && json?.data?.label) {
      return String(json.data.label)
    }
  } catch {
    /* ignore */
  }

  return null
}
