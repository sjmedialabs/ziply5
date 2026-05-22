export type GeoPermissionState = "granted" | "denied" | "prompt" | "unknown"

export async function queryGeolocationPermission(): Promise<GeoPermissionState> {
  if (typeof navigator === "undefined" || !("permissions" in navigator)) return "unknown"
  try {
    const status = await navigator.permissions.query({ name: "geolocation" as PermissionName })
    return status.state as GeoPermissionState
  } catch {
    return "unknown"
  }
}

export function watchGeolocationPermission(
  onChange: (state: GeoPermissionState) => void,
): () => void {
  if (typeof navigator === "undefined" || !("permissions" in navigator)) return () => {}

  let permissionStatus: PermissionStatus | null = null
  let cancelled = false

  void navigator.permissions
    .query({ name: "geolocation" as PermissionName })
    .then((status) => {
      if (cancelled) return
      permissionStatus = status
      onChange(status.state as GeoPermissionState)
      status.onchange = () => {
        onChange(status.state as GeoPermissionState)
      }
    })
    .catch(() => {})

  return () => {
    cancelled = true
    if (permissionStatus) permissionStatus.onchange = null
  }
}

export function getBrowserLocationGuidance(): string {
  if (typeof navigator === "undefined") {
    return "Enable location in your browser settings, then try again."
  }
  const ua = navigator.userAgent.toLowerCase()
  if (ua.includes("chrome") || ua.includes("edg")) {
    return "Click the lock icon in the address bar → Site settings → Location → Allow, then refresh this page."
  }
  if (ua.includes("firefox")) {
    return "Open the site permissions panel (lock icon) → Permissions → Location → Allow."
  }
  if (ua.includes("safari")) {
    return "Safari → Settings for This Website → Location → Allow."
  }
  return "Open your browser site settings and allow Location for this website, then try again."
}

export function isGeolocationSupported(): boolean {
  return typeof navigator !== "undefined" && "geolocation" in navigator
}

export function isSecureGeolocationContext(): boolean {
  if (typeof window === "undefined") return false
  return window.isSecureContext || window.location.hostname === "localhost"
}
