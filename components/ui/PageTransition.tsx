"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { usePathname } from "next/navigation"

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const key = useMemo(() => pathname ?? "root", [pathname])
  const [phase, setPhase] = useState<"enter" | "entered">("enter")

  useEffect(() => {
    setPhase("enter")
    const t = window.setTimeout(() => setPhase("entered"), 280)
    return () => window.clearTimeout(t)
  }, [key])

  return (
    <div
      key={key}
      className={
        phase === "enter"
          ? "premium-page-enter"
          : "premium-page-entered"
      }
    >
      {children}
    </div>
  )
}

