"use client"

import { FALLBACK_PRODUCT_IMAGE } from "@/lib/storefront-products"
import { useEffect } from "react"

/**
 * Website-only global image fallback: if any img fails to load, swap once to
 * the branded product placeholder (`public/fallback-product.png`).
 */
export default function WebsiteImageFallbackHandler() {
  useEffect(() => {
    const onError = (event: Event) => {
      const target = event.target
      if (!(target instanceof HTMLImageElement)) return
      const current = target.getAttribute("src") ?? ""
      if (!current || current === FALLBACK_PRODUCT_IMAGE) return
      if (target.dataset.fallbackApplied === "true") return
      target.dataset.fallbackApplied = "true"
      target.src = FALLBACK_PRODUCT_IMAGE
    }

    document.addEventListener("error", onError, true)
    return () => {
      document.removeEventListener("error", onError, true)
    }
  }, [])

  return null
}
