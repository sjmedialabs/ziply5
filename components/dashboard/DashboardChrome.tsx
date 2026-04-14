"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState, type ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { Menu, X } from "lucide-react"

export type DashboardNavItem = {
  href: string
  label: string
  icon: LucideIcon
}

type MePayload = {
  email?: string
  role?: string
  sub?: string
}

export function DashboardChrome({
  portalLabel,
  loginPath,
  websiteHref,
  navItems,
  children,
}: {
  portalLabel: string
  loginPath: string
  websiteHref: string
  navItems: DashboardNavItem[]
  children: ReactNode
}) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [me, setMe] = useState<MePayload | null>(null)

  useEffect(() => {
    const token = window.localStorage.getItem("ziply5_access_token")
    if (!token) return
    fetch("/api/v1/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((p: { success?: boolean; data?: MePayload }) => {
        if (p.success && p.data) setMe(p.data)
      })
      .catch(() => {})
  }, [])

  const logout = () => {
    const refresh = window.localStorage.getItem("ziply5_refresh_token")
    window.localStorage.removeItem("ziply5_access_token")
    window.localStorage.removeItem("ziply5_refresh_token")
    window.localStorage.removeItem("ziply5_user_role")
    window.dispatchEvent(new Event("storage"))
    if (refresh) {
      void fetch("/api/v1/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: refresh }),
      })
    }
    window.location.href = loginPath
  }

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(`${href}/`))

  const NavList = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="flex flex-col gap-0.5 px-2 py-3">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = isActive(href)
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-[#FFC222] text-[#4A1D1F] shadow-sm"
                : "text-[#F5F1E6]/90 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0 opacity-90" strokeWidth={2} />
            {label}
          </Link>
        )
      })}
    </nav>
  )

  return (
    <div className="flex min-h-screen bg-[#F5F1E6] text-[#2A1810]">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[#3D1518] bg-[#4A1D1F] shadow-xl transition-transform duration-200 lg:static lg:z-0 lg:translate-x-0 lg:shadow-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-4">
          <Link href={navItems[0]?.href ?? websiteHref} className="flex items-center gap-2" onClick={() => setSidebarOpen(false)}>
            <Image src="/primaryLogo.png" alt="ZiPLY5" width={120} height={44} className="h-9 w-auto object-contain" />
          </Link>
          <button
            type="button"
            className="rounded-lg p-2 text-white/80 hover:bg-white/10 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="px-4 pt-3 font-melon text-xs font-bold uppercase tracking-[0.2em] text-[#FFC222]">
          {portalLabel}
        </p>
        <div className="flex-1 overflow-y-auto">
          <NavList onNavigate={() => setSidebarOpen(false)} />
        </div>
        <div className="border-t border-white/10 p-3 text-xs text-[#F5F1E6]/70">
          <Link href={websiteHref} className="block rounded-lg px-3 py-2 hover:bg-white/10" onClick={() => setSidebarOpen(false)}>
            ← Back to store website
          </Link>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-[#E0D5C8] bg-white/95 px-3 backdrop-blur md:px-5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg p-2 text-[#4A1D1F] hover:bg-[#F5F1E6] lg:hidden"
              aria-label="Open menu"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden min-w-0 sm:block">
              <p className="truncate font-melon text-sm font-bold text-[#4A1D1F]">{portalLabel}</p>
              <p className="truncate text-xs text-[#646464]">Operations console (not the customer storefront)</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden text-right text-xs sm:block">
              <p className="font-semibold text-[#4A1D1F]">{me?.email ?? "…"}</p>
              <p className="text-[#646464] capitalize">{me?.role?.replaceAll("_", " ") ?? ""}</p>
            </div>
            <button
              type="button"
              onClick={() => logout()}
              className="rounded-full bg-[#7B3010] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-[#5c2410]"
            >
              Log out
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
