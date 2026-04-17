import type React from "react"
import type { Metadata } from "next"
import { Inter, Baloo_2 } from "next/font/google"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const baloo = Baloo_2({
  subsets: ["latin"],
  variable: "--font-baloo",
  display: "swap",
})

export const metadata: Metadata = {
  title: "ZIPLY5 - Nothing Artificial. Everything Delicious.",
  description:
    "Taste the authentic flavors of home-cooked meals. Ready-to-eat Indian food made with love and zero artificial ingredients.",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${baloo.variable}`}>
      <body className="font-sans antialiased flex flex-col">{children}</body>
    </html>
  )
}
