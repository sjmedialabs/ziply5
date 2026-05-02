import type React from "react"
import { Suspense } from "react"
import { AdminPanelLayout } from "@/components/dashboard/AdminPanelLayout"

export default function AdminPanelRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <Suspense>
      <AdminPanelLayout>{children}</AdminPanelLayout>
    </Suspense>
  )
}
