"use client"

import type React from "react"
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FolderTree,
  FileText,
  Users,
  Tag,
  BarChart3,
  Settings,
  Headphones,
  Award,
  Hash,
  ListFilter,
  Warehouse,
  Star,
  RotateCcw,
  ShoppingBag,
  Megaphone,
  Wallet,
  TrendingUp,
  Store,
  Inbox,
} from "lucide-react"
import { DashboardChrome, type DashboardNavItem } from "./DashboardChrome"

const adminNav: DashboardNavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/brands", label: "Brands", icon: Award },
  { href: "/admin/tags", label: "Tags", icon: Hash },
  { href: "/admin/attributes", label: "Attributes", icon: ListFilter },
  { href: "/admin/inventory", label: "Inventory", icon: Warehouse },
  { href: "/admin/cms", label: "CMS", icon: FileText },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/coupons", label: "Coupons", icon: Tag },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/returns", label: "Returns", icon: RotateCcw },
  { href: "/admin/abandoned-carts", label: "Abandoned carts", icon: ShoppingBag },
  { href: "/admin/promotions", label: "Promotions", icon: Megaphone },
  { href: "/admin/finance", label: "Finance", icon: Wallet },
  { href: "/admin/reports", label: "Sales report", icon: BarChart3 },
  { href: "/admin/top-products", label: "Top products", icon: TrendingUp },
  { href: "/admin/seller-performance", label: "Seller performance", icon: Store },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/inbox", label: "Inbox", icon: Inbox },
  { href: "/admin/tickets", label: "Support tickets", icon: Headphones },
]

export function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardChrome
      portalLabel="Admin console"
      loginPath="/admin/login"
      websiteHref="/"
      navItems={adminNav}
    >
      {children}
    </DashboardChrome>
  )
}
