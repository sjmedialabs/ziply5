import type React from "react"
import { redirect } from "next/navigation"

export default function SellerPanelRootLayout({
  children: _children,
}: Readonly<{
  children: React.ReactNode
}>) {
  redirect("/admin/dashboard")
}
