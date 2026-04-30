"use client"

import type { ReactNode } from "react"
import { AnimatePresence, m, useReducedMotion } from "framer-motion"

export function ModalAnimation({
  open,
  children,
  className,
}: {
  open: boolean
  children: ReactNode
  className?: string
}) {
  const reduce = useReducedMotion()
  return (
    <AnimatePresence>
      {open ? (
        <m.div
          className={className}
          initial={reduce ? { opacity: 1 } : { opacity: 0, scale: 0.98 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
          transition={reduce ? { duration: 0.12 } : { duration: 0.22, ease: "easeOut" }}
        >
          {children}
        </m.div>
      ) : null}
    </AnimatePresence>
  )
}

