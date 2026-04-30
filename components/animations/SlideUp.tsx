"use client"

import type { ReactNode } from "react"
import { m, useReducedMotion } from "framer-motion"

export function SlideUp({
  children,
  className,
  delay = 0,
  duration = 0.45,
  distance = 20,
  once = true,
}: {
  children: ReactNode
  className?: string
  delay?: number
  duration?: number
  distance?: number
  once?: boolean
}) {
  const reduce = useReducedMotion()
  return (
    <m.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: distance }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={reduce ? undefined : { once, amount: 0.25 }}
      transition={reduce ? undefined : { duration, delay, ease: "easeOut" }}
    >
      {children}
    </m.div>
  )
}

