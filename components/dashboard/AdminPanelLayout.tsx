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
  Inbox,
  Database,
} from "lucide-react"
import { DashboardChrome, type DashboardNavItem } from "./DashboardChrome"
import { useEffect, useMemo, useState } from "react"

const adminNav: DashboardNavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/inventory", label: "Inventory", icon: Warehouse },
  { href: "/admin/cms", label: "CMS", icon: FileText },
  { href: "/admin/users", label: "Users", icon: Users },
  // { href: "/admin/coupons", label: "Coupons", icon: Tag },
  { href: "/admin/marketing/coupons", label: "Coupons", icon: Tag },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/returns", label: "Returns", icon: RotateCcw },
  { href: "/admin/returns-v2", label: "Returns v2", icon: RotateCcw },
  { href: "/admin/catalog/discounts", label: "Product discounts", icon: ListFilter },
  { href: "/admin/abandoned-carts", label: "Abandoned carts", icon: ShoppingBag },
  { href: "/admin/promotions", label: "Promotions", icon: Megaphone },
  { href: "/admin/finance", label: "Finance", icon: Wallet },
  { href: "/admin/reports", label: "Sales report", icon: BarChart3 },
  { href: "/admin/top-products", label: "Top products", icon: TrendingUp },
  {
    label: "Settings",
    icon: Settings,
    subItems: [
      { href: "/admin/settings", label: "General", icon: Settings },
      { href: "/admin/categories", label: "Categories", icon: FolderTree },
      { href: "/admin/tags", label: "Tags", icon: Hash },
    ],
  },
  { href: "/admin/master", label: "Master data", icon: Database },
  { href: "/admin/inbox", label: "Inbox", icon: Inbox },
  { href: "/admin/tickets", label: "Support tickets", icon: Headphones },
  { href: "/admin/support", label: "Support v2", icon: Headphones },
]

export function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<string | null>(null)
  useEffect(() => {
    setRole(window.localStorage.getItem("ziply5_user_role"))
  }, [])
  const navItems = useMemo(
    () =>
      adminNav.filter((item) =>
        item.href === "/admin/master" ? role === "super_admin" : true,
      ),
    [role],
  )

  return (
    <DashboardChrome
      portalLabel="Admin console"
      loginPath="/admin/login"
      websiteHref="/"
      navItems={navItems}
    >
      {children}
    </DashboardChrome>
  )
}
