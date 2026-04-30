"use client"

import type { ReactNode } from "react"
import { LazyMotion, domAnimation, MotionConfig, useReducedMotion } from "framer-motion"

export function MotionProvider({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion()
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion={reduce ? "always" : "never"}>{children}</MotionConfig>
    </LazyMotion>
  )
}

