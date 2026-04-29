import type React from "react"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { PageTransition } from "@/components/ui/PageTransition"

export default function WebsiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col">
        <PageTransition>{children}</PageTransition>
      </main>
      <Footer />
    </>
  )
}
