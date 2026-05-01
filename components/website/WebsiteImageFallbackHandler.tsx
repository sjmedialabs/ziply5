"use client"

import { useEffect } from "react"

const PLACEHOLDER_SRC = "/placeholder.jpg"

/**
 * Website-only global image fallback:
 * if any <img> fails to load, swap to /placeholder.jpg.
 */
export default function WebsiteImageFallbackHandler() {
  useEffect(() => {
    const onError = (event: Event) => {
      const target = event.target
      if (!(target instanceof HTMLImageElement)) return
      const current = target.getAttribute("src") ?? ""
      if (!current || current === PLACEHOLDER_SRC) return
      if (target.dataset.fallbackApplied === "true") return
      target.dataset.fallbackApplied = "true"
      target.src = PLACEHOLDER_SRC
    }

    document.addEventListener("error", onError, true)
    return () => {
      document.removeEventListener("error", onError, true)
    }
  }, [])

  return null
}

