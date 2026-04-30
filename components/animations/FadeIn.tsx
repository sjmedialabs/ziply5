"use client"

import type { ReactNode } from "react"
import { m, useReducedMotion } from "framer-motion"

export function FadeIn({
  children,
  delay = 0,
  duration = 0.5,
  y = 16,
  className,
}: {
  children: ReactNode
  delay?: number
  duration?: number
  y?: number
  className?: string
}) {
  const reduce = useReducedMotion()
  return (
    <m.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      animate={reduce ? undefined : { opacity: 1, y: 0 }}
      transition={reduce ? undefined : { duration, delay, ease: "easeOut" }}
    >
      {children}
    </m.div>
  )
}

