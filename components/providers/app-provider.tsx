"use client"

import { ReactNode } from "react"
import { QueryProvider } from "@/components/providers/query-provider"

type Props = {
  children: ReactNode
}

export function AppProvider({ children }: Props) {
  return <QueryProvider>{children}</QueryProvider>
}
