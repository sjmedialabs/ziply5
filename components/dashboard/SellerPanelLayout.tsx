"use client"

import type React from "react"
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Headphones,
  Warehouse,
  Star,
  RotateCcw,
  Megaphone,
  Wallet,
} from "lucide-react"
import { DashboardChrome, type DashboardNavItem } from "./DashboardChrome"

const sellerNav: DashboardNavItem[] = [
  { href: "/seller/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/seller/products", label: "My products", icon: Package },
  { href: "/seller/orders", label: "Orders", icon: ShoppingCart },
  { href: "/seller/inventory", label: "Inventory", icon: Warehouse },
  { href: "/seller/reviews", label: "Reviews", icon: Star },
  { href: "/seller/returns", label: "Returns", icon: RotateCcw },
  { href: "/seller/promotions", label: "Promotions", icon: Megaphone },
  { href: "/seller/finance", label: "Finance", icon: Wallet },
  { href: "/seller/tickets", label: "Support", icon: Headphones },
]

export function SellerPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardChrome
      portalLabel="Seller console"
      loginPath="/seller/login"
      websiteHref="/"
      navItems={sellerNav}
    >
      {children}
    </DashboardChrome>
  )
}
