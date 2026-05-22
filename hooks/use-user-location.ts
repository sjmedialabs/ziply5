"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { LOCATION_DENIED_LABEL } from "@/lib/location/constants"
import {
  getCurrentLocation,
  resolveFallbackLocation,
  type FallbackSource,
} from "@/lib/location/geolocation.service"
import {
  getCachedLocation,
  isLocationPromptSkipped,
  setCachedLocation,
  setLocationPromptSkipped,
} from "@/lib/location/location-storage"
import {
  queryGeolocationPermission,
  watchGeolocationPermission,
  type GeoPermissionState,
} from "@/lib/location/permission.service"
import { toast } from "@/lib/toast"

type UseUserLocationOptions = {
  onChange?: (value: string, label: string) => void
}

export function useUserLocation({ onChange }: UseUserLocationOptions = {}) {
  const [mounted, setMounted] = useState(false)
  const [locationName, setLocationName] = useState("Detecting location...")
  const [permissionState, setPermissionState] = useState<GeoPermissionState>("unknown")
  const [modalOpen, setModalOpen] = useState(false)
  const [permanentlyBlocked, setPermanentlyBlocked] = useState(false)
  const [enabling, setEnabling] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const initStarted = useRef(false)
  const loginPulse = useRef(false)
  const abortRef = useRef(false)

  const applyLocation = useCallback(
    (label: string) => {
      setLocationName(label)
      setCachedLocation(label)
      onChange?.(label, label)
    },
    [onChange],
  )

  const showErrorToast = useCallback((title: string, description?: string) => {
    toast.error(title, description)
  }, [])

  const notifyFallback = useCallback((source: FallbackSource, gpsBlocked: boolean) => {
    if (source === "ip" && gpsBlocked) {
      toast.info(
        "Approximate location",
        "GPS is blocked. Showing city based on your network connection.",
      )
      return
    }
    if (source === "address" && gpsBlocked) {
      toast.info(
        "Delivery address",
        "GPS is blocked. Using your saved default address.",
      )
    }
  }, [])

  const applyFallbackLocation = useCallback(
    async (opts?: { notify?: boolean; gpsBlocked?: boolean }) => {
      const cached = getCachedLocation()
      const fallback = await resolveFallbackLocation(cached)
      if (!fallback) {
        setLocationName(LOCATION_DENIED_LABEL)
        return false
      }

      applyLocation(fallback.label)
      if (opts?.notify) notifyFallback(fallback.source, Boolean(opts.gpsBlocked))
      return true
    },
    [applyLocation, notifyFallback],
  )

  const maybeOpenPermissionModal = useCallback((opts?: { force?: boolean }) => {
    if (isLocationPromptSkipped() && !opts?.force) return
    if (!loginPulse.current && !opts?.force) return
    setModalOpen(true)
    loginPulse.current = false
  }, [])

  const tryFallbackAfterGpsFailure = useCallback(
    async (
      result: Extract<Awaited<ReturnType<typeof getCurrentLocation>>, { ok: false }>,
      opts?: { showModal?: boolean; fromUserAction?: boolean },
      perm?: GeoPermissionState,
    ) => {
      const gpsBlocked = result.code === "DENIED" || perm === "denied"
      if (result.code === "DENIED") {
        setPermissionState("denied")
        setPermanentlyBlocked(true)
      }

      const gotFallback = await applyFallbackLocation({
        notify: Boolean(opts?.fromUserAction || gpsBlocked),
        gpsBlocked,
      })

      if (gotFallback) {
        if (gpsBlocked && opts?.fromUserAction) {
          toast.warning(
            "GPS blocked",
            "Showing approximate location. Enable location in browser settings for precise GPS.",
          )
        }
        return true
      }

      if (result.code === "DENIED") {
        setLocationName(LOCATION_DENIED_LABEL)
        if (opts?.fromUserAction) {
          toast.warning(
            "Location blocked",
            "Allow location in browser settings, or add a delivery address in your profile.",
          )
        } else if (opts?.showModal !== false) {
          maybeOpenPermissionModal({ force: opts?.fromUserAction })
        }
        return false
      }

      if (result.code === "TIMEOUT") {
        showErrorToast("Location timed out", result.message)
      } else if (result.code === "UNSUPPORTED" || result.code === "INSECURE") {
        showErrorToast("Location unavailable", result.message)
      } else if (result.code === "REVERSE_GEOCODE_FAILED" || result.code === "EMPTY_COORDS") {
        showErrorToast("Location error", result.message)
      } else {
        showErrorToast("Location unavailable", result.message)
      }
      return false
    },
    [applyFallbackLocation, maybeOpenPermissionModal, showErrorToast],
  )

  const requestCurrentLocation = useCallback(
    async (opts?: { showModalOnDeny?: boolean; fromUserAction?: boolean }) => {
      if (abortRef.current) return false
      setEnabling(true)
      setLocationName("Requesting access...")

      if (opts?.fromUserAction) {
        setPermanentlyBlocked(false)
      }

      const locationPromise = getCurrentLocation()
      const permissionPromise = queryGeolocationPermission()

      const [result, perm] = await Promise.all([locationPromise, permissionPromise])
      if (abortRef.current) return false

      setPermissionState(perm)
      if (perm === "denied" && !result.ok && result.code === "DENIED") {
        setPermanentlyBlocked(true)
      } else if (result.ok || perm === "granted" || perm === "prompt") {
        setPermanentlyBlocked(false)
      }

      if (result.ok) {
        applyLocation(result.label)
        setPermissionState("granted")
        setPermanentlyBlocked(false)
        setModalOpen(false)
        setEnabling(false)
        if (opts?.fromUserAction) toast.success("Location updated", result.label)
        return true
      }

      const recovered = await tryFallbackAfterGpsFailure(
        result,
        {
          showModal: opts?.showModalOnDeny !== false && result.code === "DENIED",
          fromUserAction: opts?.fromUserAction,
        },
        perm,
      )
      setEnabling(false)
      return recovered
    },
    [applyLocation, tryFallbackAfterGpsFailure],
  )

  const continueWithoutLocation = useCallback(async () => {
    setLocationPromptSkipped(true)
    setModalOpen(false)
    setEnabling(false)

    const gotFallback = await applyFallbackLocation({ notify: true, gpsBlocked: true })
    if (!gotFallback) {
      setLocationName(LOCATION_DENIED_LABEL)
      toast.info("Continuing without GPS", "Add a delivery address or enable location later from the header.")
    }
  }, [applyFallbackLocation])

  /** Page refresh / mount: cache + IP/address only — no GPS, no permission modal. */
  const runSilentInit = useCallback(async () => {
    const perm = await queryGeolocationPermission()
    setPermissionState(perm)
    if (perm === "denied") setPermanentlyBlocked(true)

    const cached = getCachedLocation()
    if (cached) {
      setLocationName(cached)
      onChange?.(cached, cached)
      return
    }

    await applyFallbackLocation({ notify: false, gpsBlocked: perm === "denied" })
  }, [applyFallbackLocation, onChange])

  /** After login: try GPS and show modal if still blocked. */
  const runLoginLocationFlow = useCallback(async () => {
    loginPulse.current = true

    const perm = await queryGeolocationPermission()
    setPermissionState(perm)

    const cached = getCachedLocation()
    if (cached) {
      setLocationName(cached)
      onChange?.(cached, cached)
    }

    if (perm === "granted" || perm === "prompt" || perm === "unknown") {
      const ok = await requestCurrentLocation({ showModalOnDeny: true })
      if (ok) return
      await applyFallbackLocation({ notify: false, gpsBlocked: false })
      return
    }

    if (perm === "denied") {
      setPermanentlyBlocked(true)
      const gotFallback = await applyFallbackLocation({ notify: false, gpsBlocked: true })
      if (!gotFallback) setLocationName(LOCATION_DENIED_LABEL)
      maybeOpenPermissionModal()
    }
  }, [applyFallbackLocation, maybeOpenPermissionModal, onChange, requestCurrentLocation])

  useEffect(() => {
    abortRef.current = false
    setMounted(true)
    return () => {
      abortRef.current = true
    }
  }, [])

  useEffect(() => {
    if (!mounted || initStarted.current) return
    initStarted.current = true
    void runSilentInit()
  }, [mounted, runSilentInit])

  useEffect(() => {
    if (!mounted) return

    const onLogin = (e: Event) => {
      if (!(e instanceof CustomEvent) || e.detail?.event !== "SESSION_PERSISTED") return
      setLocationPromptSkipped(false)
      void runLoginLocationFlow()
    }

    window.addEventListener("ziply5:auth-state-change", onLogin)
    return () => window.removeEventListener("ziply5:auth-state-change", onLogin)
  }, [mounted, runLoginLocationFlow])

  useEffect(() => {
    if (!mounted) return
    return watchGeolocationPermission((state) => {
      setPermissionState(state)
      if (state === "denied") {
        setPermanentlyBlocked(true)
        void applyFallbackLocation({ notify: false, gpsBlocked: true })
      }
    })
  }, [mounted, applyFallbackLocation])

  const handleEnableFromModal = useCallback(() => {
    setModalOpen(false)
    void requestCurrentLocation({ showModalOnDeny: false, fromUserAction: true })
  }, [requestCurrentLocation])

  const handleUseCurrentLocation = useCallback(() => {
    setMenuOpen(false)
    setLocationPromptSkipped(false)
    void requestCurrentLocation({ showModalOnDeny: false, fromUserAction: true })
  }, [requestCurrentLocation])

  /** User opened location dropdown — show modal if needed (GPS only after Enable / Use Current Location). */
  const handleUserOpensDropdown = useCallback(async () => {
    const perm = await queryGeolocationPermission()
    setPermissionState(perm)
    if (perm === "denied") setPermanentlyBlocked(true)

    if ((perm === "prompt" || perm === "denied" || perm === "unknown") && !isLocationPromptSkipped()) {
      setModalOpen(true)
    }
  }, [])

  const toggleMenuOpen = useCallback(
    (open: boolean) => {
      setMenuOpen(open)
      if (open) void handleUserOpensDropdown()
    },
    [handleUserOpensDropdown],
  )

  return {
    mounted,
    locationName,
    permissionState,
    modalOpen,
    setModalOpen,
    permanentlyBlocked,
    enabling,
    menuOpen,
    setMenuOpen: toggleMenuOpen,
    requestCurrentLocation,
    continueWithoutLocation,
    handleEnableFromModal,
    handleUseCurrentLocation,
  }
}
