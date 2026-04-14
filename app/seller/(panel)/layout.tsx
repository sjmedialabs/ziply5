import type React from "react"
import { SellerPanelLayout } from "@/components/dashboard/SellerPanelLayout"

export default function SellerPanelRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <SellerPanelLayout>{children}</SellerPanelLayout>
}
