import type React from "react"
import type { Metadata } from "next"
import { Inter, Baloo_2 } from "next/font/google"
import "./globals.css"
import { AppProvider } from "@/components/providers/app-provider"
import { getRootLayoutMetadata } from "@/src/server/modules/site/site-settings"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const baloo = Baloo_2({
  subsets: ["latin"],
  variable: "--font-baloo",
  display: "swap",
  preload: false,
})

export async function generateMetadata(): Promise<Metadata> {
  const base = await getRootLayoutMetadata()
  return {
    ...base,
    generator: "v0.app",
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${baloo.variable}`}>
      <body className="font-sans antialiased flex flex-col">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  )
}
