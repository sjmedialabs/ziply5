"use client"

import { ReactNode } from "react"
import { QueryProvider } from "@/components/providers/query-provider"
import { SessionProvider } from "@/components/providers/session-provider"
import { MotionProvider } from "@/components/animations/MotionProvider"

type Props = {
  children: ReactNode
}

export function AppProvider({ children }: Props) {
  return (
    <QueryProvider>
      <MotionProvider>
        <SessionProvider />
        {children}
      </MotionProvider>
    </QueryProvider>
  )
}
