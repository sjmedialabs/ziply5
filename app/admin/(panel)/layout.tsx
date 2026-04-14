import type React from "react"
import { AdminPanelLayout } from "@/components/dashboard/AdminPanelLayout"

export default function AdminPanelRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <AdminPanelLayout>{children}</AdminPanelLayout>
}
