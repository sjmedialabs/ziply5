"use client"

import type { ReactNode } from "react"
import { m, useReducedMotion } from "framer-motion"

export function ScaleHover({
  children,
  className,
  scale = 1.03,
  tapScale = 0.97,
}: {
  children: ReactNode
  className?: string
  scale?: number
  tapScale?: number
}) {
  const reduce = useReducedMotion()
  return (
    <m.div
      className={className}
      whileHover={reduce ? undefined : { scale }}
      whileTap={reduce ? undefined : { scale: tapScale }}
      transition={reduce ? undefined : { duration: 0.18, ease: "easeOut" }}
    >
      {children}
    </m.div>
  )
}

