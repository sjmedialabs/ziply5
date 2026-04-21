"use client"

import { ReactNode } from "react"
import { QueryProvider } from "@/components/providers/query-provider"
import { SessionProvider } from "@/components/providers/session-provider"

type Props = {
  children: ReactNode
}

export function AppProvider({ children }: Props) {
  return (
    <QueryProvider>
      <SessionProvider />
      {children}
    </QueryProvider>
  )
}
