"use client"

import { useEffect } from "react"
import { initSessionAutoRefresh, installGlobalApiInterceptor, uninstallGlobalApiInterceptor } from "@/lib/auth-session"

export function SessionProvider() {
  useEffect(() => {
    installGlobalApiInterceptor()
    const teardown = initSessionAutoRefresh()
    return () => {
      uninstallGlobalApiInterceptor()
      teardown?.()
    }
  }, [])

  return null
}
