"use client"

import Link from "next/link"
import { Menu, X } from "lucide-react"
import { useState, useRef, useEffect, useCallback } from "react"
import Image from "next/image"
import CartDropdown from "./CartDropdown"
import { useSearch } from "../hooks/useSearch"
import LocationDropdown from "./LocationDropdown"
import { Search, User, ShoppingCart } from "lucide-react"
import { getCartItems, setCartItems, type CartItem } from "@/lib/cart"
import { AnimatePresence, m, useReducedMotion } from "framer-motion"

type MenuCategory = {
  id: string
  name: string
  slug: string
  products: Array<{ id: string; name: string; slug: string }>
}

type ApiCategory = { id?: string; name?: string; slug?: string }
type ApiProduct = {
  id?: string
  name?: string
  slug?: string
  categories?: Array<{ categoryId?: string; category?: { id?: string } }>
}

export default function Header() {
  const reduce = useReducedMotion()
  const [menuOpen, setMenuOpen] = useState(false)
  const { searchOpen, setSearchOpen, searchQuery, setSearchQuery, searchResults, handleSearch } = useSearch()
  const [cartItems, setLocalCartItems] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [profileHref, setProfileHref] = useState("/login")
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([])
  const closeCartTimeoutRef = useRef<number | null>(null)
  const [cmsData, setCmsData] = useState<any>(null)

  const productRef = useRef<HTMLDivElement>(null)
  const [arrowLeft, setArrowLeft] = useState(0)

  const loadMenuData = useCallback(async () => {
    try {
      const [catsRes, productsRes] = await Promise.all([
        fetch("/api/v1/categories").then((r) => r.json()).catch(() => ({ data: [] })),
        // Dropdown only needs a small subset; reduce load.
        fetch("/api/v1/products?page=1&limit=80").then((r) => r.json()).catch(() => ({ data: { items: [] } })),
      ])

      const cats = ((catsRes as { data?: ApiCategory[] })?.data ?? [])
        .filter((c) => c.id && c.name)
        .map((c) => ({
          id: c.id as string,
          name: c.name as string,
          slug: (c.slug ?? c.name ?? "").toString(),
        }))

      const products = ((productsRes as { data?: { items?: ApiProduct[] } })?.data?.items ?? [])
        .filter((p) => p.id && p.name && p.slug)

      let grouped = cats.map((cat) => ({
        ...cat,
        products: products
          .filter((p) =>
            p.categories?.some((x) => x.category?.id === cat.id || x.categoryId === cat.id),
          )
          .map((p) => ({ id: p.id as string, name: p.name as string, slug: p.slug as string })),
      }))

      const hasAnyMappedProducts = grouped.some((g) => g.products.length > 0)
      if (!hasAnyMappedProducts && cats.length > 0 && products.length > 0) {
        grouped = grouped.map((g, idx) => ({
          ...g,
          products:
            idx === 0
              ? products.map((p) => ({
                  id: p.id as string,
                  name: p.name as string,
                  slug: p.slug as string,
                }))
              : [],
        }))
      }

      setMenuCategories(grouped.filter((c) => c.products.length > 0).slice(0, 8))
    } catch {
      setMenuCategories([])
    }
  }, [])

  const persistCart = (next: CartItem[]) => {
    setLocalCartItems(next)
    setCartItems(next)
  }

  const updateCartQuantity = (id: string, delta: number) => {
    const current = cartItems.find((item) => item.id === id)
    if (!current) return

    const nextQty = current.quantity + delta
    const next =
      nextQty <= 0
        ? cartItems.filter((item) => item.id !== id)
        : cartItems.map((item) => (item.id === id ? { ...item, quantity: nextQty } : item))

    persistCart(next)
  }

  const openCart = () => {
    if (closeCartTimeoutRef.current) {
      window.clearTimeout(closeCartTimeoutRef.current)
      closeCartTimeoutRef.current = null
    }
    setCartOpen(true)
  }

  const closeCartWithDelay = () => {
    if (closeCartTimeoutRef.current) {
      window.clearTimeout(closeCartTimeoutRef.current)
    }
    closeCartTimeoutRef.current = window.setTimeout(() => {
      setCartOpen(false)
    }, 180)
  }

  useEffect(() => {
    const syncCart = () => setLocalCartItems(getCartItems())
    const syncProfileHref = () => {
      const token = window.localStorage.getItem("ziply5_access_token")
      const role = window.localStorage.getItem("ziply5_user_role")
      if (!token) {
        setProfileHref("/login")
        return
      }
      if (role === "admin" || role === "super_admin") {
        setProfileHref("/admin/dashboard")
        return
      }
      setProfileHref("/profile")
    }

    const fetchCmsData = async () => {
      try {
        const res = await fetch("/api/v1/cms/pages?slug=header")
        const json = await res.json()
        if (json.data) {
          const headerContent = json.data.sections?.find((s: any) => s.sectionType === 'header')?.contentJson || {}
          setCmsData(headerContent)
        }
      } catch (err) {
        console.error("Failed to load header CMS data", err)
      }
    }

    syncCart()
    syncProfileHref()
    void loadMenuData()
    void fetchCmsData()

    window.addEventListener("ziply5:cart-updated", syncCart)
    window.addEventListener("storage", syncProfileHref)
    window.addEventListener("storage", syncCart)
    return () => {
      if (closeCartTimeoutRef.current) {
        window.clearTimeout(closeCartTimeoutRef.current)
      }
      window.removeEventListener("ziply5:cart-updated", syncCart)
      window.removeEventListener("storage", syncProfileHref)
      window.removeEventListener("storage", syncCart)
    }
  }, [loadMenuData])

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return (
    <header className="sticky top-0 z-[100]">
      {/* Top Marquee Bar */}
      <div className="bg-yellow-400 py-2.5 overflow-hidden relative z-0">
        <div className="marquee-container">
          <div className="marquee-content ">
            <span className="marquee-item ">SUBSCRIBE & SAVE</span>
            <span className="marquee-dot">•</span>
            <span className="marquee-item">SUBSCRIBE & SAVE 15%</span>
            <span className="marquee-dot">•</span>
            <span className="marquee-item">SUBSCRIBE & SAVE 15%</span>
            <span className="marquee-dot">•</span>
            <span className="marquee-item">SUBSCRIBE & SAVE 15%</span>
            <span className="marquee-dot">•</span>
            <span className="marquee-item">SUBSCRIBE & SAVE 15%</span>
            <span className="marquee-dot">•</span>
            <span className="marquee-item">SUBSCRIBE & SAVE</span>
            <span className="marquee-dot">•</span>
            <span className="marquee-item">SUBSCRIBE & SAVE 15%</span>
            <span className="marquee-dot">•</span>
            <span className="marquee-item">SUBSCRIBE & SAVE 15%</span>
            <span className="marquee-dot">•</span>
            <span className="marquee-item">SUBSCRIBE & SAVE 15%</span>
            <span className="marquee-dot">•</span>
            <span className="marquee-item">SUBSCRIBE & SAVE 15%</span>
            <span className="marquee-dot">•</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="bg-white w-full relative z-10">
        <div className="w-full px-4 max-w-7xl mx-auto flex items-center justify-between py-2">

          {/* MOBILE MENU BUTTON */}
          <button
            className="lg:hidden z-40"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <div className="hidden lg:flex items-center gap-8">

            {/* PRODUCTS WITH DROPDOWN */}
            <div
              ref={productRef}
              className="relative group flex flex-col items-center"
              onMouseEnter={() => {
                if (productRef.current) {
                  const rect = productRef.current.getBoundingClientRect()
                  setArrowLeft(rect.left + rect.width / 2)
                }
                if (menuCategories.length === 0) {
                  void loadMenuData()
                }
              }}
            >
              <Link href="/products" className="font-extrabold text-black hover:text-[#f97316] transition-colors text-[15px]">
                Products
              </Link>

              {/* DROPDOWN */}
              <div className="absolute left-0 top-[calc(100%+16px)] w-[100vw] flex justify-start opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300">

                <div className="relative w-full max-w-7xl">

                  {/*  DYNAMIC ARROW */}
                  {/* <div
                    className="absolute -top-3 w-0 h-0 
                      border-l-[10px] border-r-[10px] border-b-[10px] 
                      border-l-transparent border-r-transparent border-b-[#7a1e0e] transition-all duration-200"
                    style={{
                      left: arrowLeft,
                      transform: "translateX(-10%)"
                    }}
                  /> */}

                  <div className="bg-[#7a1e0e] text-white rounded-2xl shadow-xl py-10 px-8">
                    <div className="grid grid-cols-4 gap-10">
                      {menuCategories.length === 0 ? (
                        <div className="col-span-4 text-sm text-white/80">No categories with products yet.</div>
                      ) : (
                        menuCategories.map((category) => (
                          <div key={category.id}>
                            <h3 className="text-lg font-bold mb-4">{category.name}</h3>
                            <ul className="space-y-3">
                              {category.products.slice(0, 8).map((product, idx) => (
                                <li key={product.id}>
                                  <Link href={`/product/${product.slug}`} className={`${idx === 0 ? "text-orange-400 font-semibold" : "text-white"} hover:underline`}>
                                    {product.name}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>
              </div>
            </div>

            <Link href={cmsData?.link1Url || "/#best-sellers"} className="font-extrabold text-black hover:text-[#f97316] transition-colors text-[15px]">
              {cmsData?.link1Title || "Best Sellers"}
            </Link>

            <Link
              href={cmsData?.link2Url || "/products?type=combo"}
              className="font-extrabold text-black hover:text-[#f97316] transition-colors text-[15px]"
            >
              {cmsData?.link2Title || "Combos"}
            </Link>
          </div>

          <div className="flex-1 lg:flex-none flex justify-center">
            <Link href="/" className="flex items-center">
              <Image
                src={cmsData?.logo || "/primaryLogo.png"}
                alt="ZiPLY5 Logo"
                width={180}
                height={80}
                priority
                className="h-auto w-auto object-contain"
              />
            </Link>
          </div>

          <div className="flex items-center gap-3 md:gap-5">

            <div className="hidden lg:block">
              <LocationDropdown />
            </div>

            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 hover:bg-zinc-50 cursor-pointer rounded-full transition-colors"
              title="Click and Search For Delicious meals.."
            >
              <Search size={20} className="text-zinc-700 hover:text-[#f97316]" />
            </button>

            <div className="hidden lg:flex items-center gap-6">

              <Link href={profileHref} className="p-2 hover:bg-zinc-50 rounded-full transition-colors">
                <User size={20} className="text-zinc-700 hover:text-[#f97316]" />
              </Link>

              {/* CART WITH DROPDOWN */}
              <div className="relative" onMouseEnter={openCart} onMouseLeave={closeCartWithDelay}>
                <Link
                  href="/cart"
                  className="relative flex items-center justify-center w-8 h-8 rounded-full hover:bg-zinc-50 transition-colors"
                >
                  <ShoppingCart size={20} className="text-zinc-700 hover:text-[#f97316]" />
                  {cartCount > 0 && (
                    <m.span
                      key={cartCount}
                      initial={reduce ? undefined : { scale: 0.9 }}
                      animate={reduce ? undefined : { scale: [1, 1.15, 1] }}
                      transition={reduce ? undefined : { duration: 0.35, ease: "easeOut" }}
                      className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#f97316] px-1 text-[10px] font-bold text-white"
                    >
                      {cartCount}
                    </m.span>
                  )}
                </Link>

                <CartDropdown
                  items={cartItems}
                  total={total}
                  open={cartOpen}
                  onIncrement={(id) => updateCartQuantity(id, 1)}
                  onDecrement={(id) => updateCartQuantity(id, -1)}
                />

              </div>

            </div>

          </div>
        </div>
      </nav>

      <AnimatePresence initial={false}>
        {menuOpen ? (
          <m.div
            key="mobile-menu"
            initial={reduce ? { opacity: 1 } : { opacity: 0, y: -8 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={reduce ? { duration: 0.12 } : { duration: 0.22, ease: "easeOut" }}
            className="lg:hidden bg-white border-t px-6 py-4 space-y-4 shadow-md"
          >
            <div className="pb-4 border-b">
              <LocationDropdown />
            </div>

            <Link href="/products" onClick={() => setMenuOpen(false)} className="block font-semibold text-black">
              Products
            </Link>
            <Link href={cmsData?.link1Url || "/#best-sellers"} onClick={() => setMenuOpen(false)} className="block font-semibold text-black">
              {cmsData?.link1Title || "Best Sellers"}
            </Link>
            <Link
              href={cmsData?.link2Url || "/products?type=combo"}
              onClick={() => setMenuOpen(false)}
              className="block font-semibold text-black"
            >
              {cmsData?.link2Title || "Combos"}
            </Link>
            <Link href={profileHref} onClick={() => setMenuOpen(false)} className="block font-semibold text-black">
              Profile
            </Link>
            <Link href="/cart" onClick={() => setMenuOpen(false)} className="block font-semibold text-black">
              Cart
            </Link>
          </m.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {searchOpen ? (
          <m.div
            key="search-overlay"
            className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-24"
            onClick={() => setSearchOpen(false)}
            initial={reduce ? { opacity: 1 } : { opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0 }}
            transition={reduce ? { duration: 0.12 } : { duration: 0.22, ease: "easeOut" }}
          >
            <m.div
              className="bg-white rounded-2xl p-6 w-[90%] max-w-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              initial={reduce ? { opacity: 1 } : { opacity: 0, scale: 0.98, y: 8 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 8 }}
              transition={reduce ? { duration: 0.12 } : { duration: 0.22, ease: "easeOut" }}
            >
              <form onSubmit={handleSearch} className="flex gap-3">
                <input
                  type="text"
                  placeholder="Search for delicious meals..."
                  className="flex-1 px-4 py-3 border-2 border-orange-200 rounded-xl focus:outline-none focus:border-orange-500 font-medium"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                <button type="submit" className="px-6 py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-colors">
                  Search
                </button>
              </form>
              <div className="mt-4 max-h-80 overflow-auto rounded-xl border border-orange-100">
                {searchResults.map((item) => (
                  <Link
                    key={item.slug}
                    href={`/product/${item.slug}`}
                    onClick={() => setSearchOpen(false)}
                    className="flex items-center justify-between border-b border-orange-50 px-4 py-3 last:border-b-0 hover:bg-orange-50"
                  >
                    <span className="text-sm font-medium text-zinc-800">{item.name}</span>
                    <span className="text-xs font-semibold text-zinc-500">Rs.{item.price.toFixed(2)}</span>
                  </Link>
                ))}
                {searchResults.length === 0 && (
                  <p className="px-4 py-5 text-center text-sm text-zinc-500">No products found for "{searchQuery}"</p>
                )}
              </div>
            </m.div>
          </m.div>
        ) : null}
      </AnimatePresence>
    </header>
  )
}