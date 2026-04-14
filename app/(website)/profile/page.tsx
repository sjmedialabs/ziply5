"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Facebook, Twitter, Linkedin } from "lucide-react"
import { User, Star, Package } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { getFavoriteSlugs, toggleFavoriteSlug } from "@/lib/favorites"
import { addToCart, getCartItems, setCartItemQuantity } from "@/lib/cart"
import { useStorefrontProducts } from "@/hooks/useStorefrontProducts"

type ApiOrderRow = {
  id: string
  status: string
  total: string | number
  createdAt: string
  items: Array<{ quantity: number; product: { name: string } }>
}

function ProfilePageContent() {
  const { products } = useStorefrontProducts(200)
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialTab = searchParams.get("tab")
  const [activeTab, setActiveTab] = useState("about")
  const [favoriteSlugs, setFavoriteSlugs] = useState<string[]>([])
  const [cartQtyBySlug, setCartQtyBySlug] = useState<Record<string, number>>({})
  const [orders, setOrders] = useState<ApiOrderRow[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersError, setOrdersError] = useState("")
  const [authSnapshot, setAuthSnapshot] = useState<{ token: string | null; role: string | null }>({
    token: null,
    role: null,
  })

  useEffect(() => {
    if (initialTab === "favorite" || initialTab === "about" || initialTab === "orders") {
      setActiveTab(initialTab)
    }
  }, [initialTab])

  useEffect(() => {
    const syncFavorites = () => setFavoriteSlugs(getFavoriteSlugs())
    syncFavorites()
    window.addEventListener("ziply5:favorites-updated", syncFavorites)
    window.addEventListener("storage", syncFavorites)
    return () => {
      window.removeEventListener("ziply5:favorites-updated", syncFavorites)
      window.removeEventListener("storage", syncFavorites)
    }
  }, [])

  useEffect(() => {
    const syncCartQty = () => {
      const items = getCartItems()
      const qtyMap = items.reduce<Record<string, number>>((acc, item) => {
        acc[item.slug] = item.quantity
        return acc
      }, {})
      setCartQtyBySlug(qtyMap)
    }

    syncCartQty()
    window.addEventListener("ziply5:cart-updated", syncCartQty)
    window.addEventListener("storage", syncCartQty)
    return () => {
      window.removeEventListener("ziply5:cart-updated", syncCartQty)
      window.removeEventListener("storage", syncCartQty)
    }
  }, [])

  useEffect(() => {
    const syncAuth = () => {
      setAuthSnapshot({
        token: window.localStorage.getItem("ziply5_access_token"),
        role: window.localStorage.getItem("ziply5_user_role"),
      })
    }
    syncAuth()
    window.addEventListener("storage", syncAuth)
    return () => window.removeEventListener("storage", syncAuth)
  }, [])

  useEffect(() => {
    if (activeTab !== "orders") return
    const token = window.localStorage.getItem("ziply5_access_token")
    const role = window.localStorage.getItem("ziply5_user_role")
    if (!token || role !== "customer") {
      setOrders([])
      setOrdersError("")
      return
    }

    let cancelled = false
    const load = async () => {
      setOrdersLoading(true)
      setOrdersError("")
      try {
        const res = await fetch("/api/v1/orders?page=1&limit=20", {
          headers: { Authorization: `Bearer ${token}` },
        })
        const payload = (await res.json()) as {
          success?: boolean
          data?: { items: ApiOrderRow[] }
          message?: string
        }
        if (cancelled) return
        if (!res.ok || !payload.success || !payload.data) {
          setOrdersError(payload.message ?? "Could not load orders.")
          setOrders([])
          return
        }
        setOrders(payload.data.items)
      } catch {
        if (!cancelled) {
          setOrdersError("Could not load orders.")
          setOrders([])
        }
      } finally {
        if (!cancelled) setOrdersLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [activeTab])

  const favoriteProducts = useMemo(() => {
    return favoriteSlugs.map((slug) => {
      const existing = products.find((item) => item.slug === slug)
      if (existing) return existing

      const fallbackName = slug
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")

      return {
        id: Number(`9${Math.abs(slug.length)}`),
        name: fallbackName,
        slug,
        price: 229.25,
        oldPrice: 310,
        weight: "95 g",
        description: "Favourite product",
        type: "non-veg" as const,
        category: "all",
        image: "/assets/product listing/Ziply5 - Pouch - Butter Chk Rice 3.png",
        gallery: [],
        labels: [],
        features: [],
        details: [],
        variants: [],
      }
    })
  }, [favoriteSlugs, products])

  const socialLinks = [
    { icon: Facebook, link: "https://facebook.com" },
    { icon: Twitter, link: "https://twitter.com" },
    { icon: Linkedin, link: "https://linkedin.com" },
    { icon: "G", link: "https://google.com" },
  ]

  const removeFavorite = (slug: string) => {
    toggleFavoriteSlug(slug)
    setFavoriteSlugs(getFavoriteSlugs())
  }

  const updateCartQty = (product: (typeof favoriteProducts)[number], delta: number) => {
    const currentQty = cartQtyBySlug[product.slug] ?? 0
    const nextQty = Math.max(0, currentQty + delta)
    setCartItemQuantity(product, nextQty)
  }

  const handleLogout = async () => {
    const refreshToken = window.localStorage.getItem("ziply5_refresh_token")

    try {
      if (refreshToken) {
        await fetch("/api/v1/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        })
      }
    } catch {
      // Ignore network/logout API errors and continue local logout.
    } finally {
      window.localStorage.removeItem("ziply5_access_token")
      window.localStorage.removeItem("ziply5_refresh_token")
      window.localStorage.removeItem("ziply5_user_role")
      window.dispatchEvent(new Event("storage"))
      router.push("/login")
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f0dc] py-10 md:py-16 px-4">
      <div className="max-w-5xl mx-auto md:flex gap-30">

        {/* LEFT SIDEBAR */}
        <div
          className="
            w-full md:w-[260px]
            bg-white font-melon overflow-hidden border
            flex md:block
          "
        >

          {/* TAB ITEM */}
          <div
            onClick={() => setActiveTab("about")}
            className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-3 px-3 md:px-5 py-4 cursor-pointer border-b md:border-b ${
              activeTab === "about"
                ? "bg-white text-orange-500 md:border-r-4 shadow-[inset_-4px_0_6px_rgba(0,0,0,0.1)] border-orange-500"
                : "text-gray-400"
            }`}
          >
            <User size={18} />
            <span className="font-medium">About Me</span>
          </div>

          <div
            onClick={() => setActiveTab("favorite")}
            className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-3 px-3 md:px-5 py-4 cursor-pointer border-b md:border-b ${
              activeTab === "favorite"
                ? "bg-white text-orange-500 md:border-r-4 shadow-[inset_-4px_0_6px_rgba(0,0,0,0.1)] border-orange-500"
                : "text-gray-400"
            }`}
          >
            <Star size={18} />
            <span className="font-medium">Favorite</span>
          </div>

          <div
            onClick={() => setActiveTab("orders")}
            className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-3 px-3 md:px-5 py-4 cursor-pointer ${
              activeTab === "orders"
                ? "bg-white text-orange-500 md:border-r-4 shadow-[inset_-4px_0_6px_rgba(0,0,0,0.1)] border-orange-500"
                : "text-gray-400"
            }`}
          >
            <Package size={18} />
            <span className="font-medium">Order history</span>
          </div>
        </div>

        {/* RIGHT CONTENT */}
        <div className="flex-1 mt-6 md:mt-0">
          <div className="mb-5 flex justify-end">
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md bg-[#5A272A] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-[#451f21]"
            >
              Logout
            </button>
          </div>

          {activeTab === "about" && (
            <div className="space-y-6 text-sm gap-2">

              <div className="flex">
                <p className="w-24 font-bold text-gray-700">Bio</p>
                <p className="text-gray-600 max-w-md">
                  When I first got into the advertising, I was looking for the magical combination that would put website into the top search engine rankings
                </p>
              </div>

              <div className="flex">
                <p className="w-24 font-bold text-gray-700">Email</p>
                <p className="text-gray-600">keshav krishan@gmail.com</p>
              </div>

              <div className="flex">
                <p className="w-24 font-bold text-gray-700">contact</p>
                <p className="text-gray-600">621-770-7689</p>
              </div>

              <div className="flex">
                <p className="w-24 font-bold text-gray-700">Addresses</p>
                <Link href="/addresses" className="text-orange-600 underline hover:text-orange-700">
                  Manage saved addresses
                </Link>
              </div>

              <div className="flex">
                <p className="w-24 font-bold text-gray-700">Address</p>
                <p className="text-gray-600">
                  27 street jonway, NY America USA
                </p>
              </div>

              <div className="flex">
                <p className="w-24 font-bold text-gray-700">Phone</p>
                <p className="text-gray-600">439-582-1578</p>
              </div>

              {/* SOCIAL */}
              <div className="flex items-center">
                <p className="w-24 font-bold text-gray-700">Social</p>

                <div className="flex gap-3">
                  {socialLinks.map((item, i) => {
                    const Icon = item.icon
                    return (
                      <a
                        key={i}
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-8 h-8 flex items-center justify-center 
                        border border-gray-400 text-orange-500 
                        rounded-md cursor-pointer 
                        hover:bg-orange-500 hover:text-white transition"
                      >
                        {typeof Icon === "string" ? (
                          <span className="font-semibold">{Icon}</span>
                        ) : (
                          <Icon size={14} />
                        )}
                      </a>
                    )
                  })}
                </div>
              </div>

            </div>
          )}

          {activeTab === "favorite" && (
            <>
              {favoriteProducts.length === 0 ? (
                <p className="text-gray-500">No favorites yet.</p>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {favoriteProducts.map((product) => (
                    <article
                      key={product.slug}
                      className="relative rounded-2xl border-2 border-transparent p-4 transition-all duration-300 hover:border-[#F0E4A3]"
                      style={{ backgroundColor: "#3EA6CF" }}
                    >
                      <span className="absolute right-3 top-3 text-lg text-white">♥</span>
                      <Link href={`/product/${product.slug}`} className="block">
                        <div className="relative mx-auto h-[200px] w-full max-w-[130px]">
                          <Image src={product.image} alt={product.name} fill className="object-contain" />
                        </div>
                        <h3 className="mt-2 text-center text-[18px] font-black uppercase leading-tight text-white">{product.name}</h3>
                        <p className="mt-1 text-center text-[10px] font-semibold uppercase text-white/90">Home style meal | Net wt. {product.weight}</p>
                      </Link>
                      {/*    */}
                      {/* <div className="mt-2 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => addToCart(product, 1)}
                          className="rounded-md bg-white/85 py-1 text-[10px] font-semibold uppercase text-[#5A272A]"
                        >
                          Add 1 more
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            addToCart(product, 1)
                            router.push("/cart")
                          }}
                          className="rounded-md bg-[#5A272A] py-1 text-[10px] font-semibold uppercase text-white"
                        >
                          Buy now
                        </button>
                      </div> */}
                      <div className="mt-3 flex items-center justify-between gap-2">
                    {(cartQtyBySlug[product.slug] ?? 0) > 0 ? (
                      <div className="flex items-center rounded-md border border-[#d5c4b8] bg-white/95 px-1 py-0.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCartItemQuantity(product, Math.max(0, (cartQtyBySlug[product.slug] ?? 0) - 1));
                          }}
                          className="h-6 w-6 rounded text-sm font-light text-[#5A272A] hover:bg-[#f4efec]"
                        >
                          -
                        </button>
                        <span className="min-w-5 text-center text-xs font-light text-[#5A272A]">
                          {cartQtyBySlug[product.slug] ?? 0}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCartItemQuantity(product, (cartQtyBySlug[product.slug] ?? 0) + 1);
                          }}
                          className="h-6 w-6 rounded text-sm font-light text-[#5A272A] hover:bg-[#f4efec]"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCartItemQuantity(product, 1);
                        }}
                        className="rounded-lg border border-white tracking-wide px-4 py-1.5 text-[12px] font-light text-white hover:bg-primary hover:text-white transition-all "
                      >
                        Add to Cart
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push("/checkout")
                      }} className="rounded-lg bg-primary tracking-wide px-3 py-1.5 text-[12px] font-light text-white hover:bg-[#2d1011]">
                      Buy Now
                    </button>
                  </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === "orders" && (
            <div className="space-y-4 text-sm">
              {!authSnapshot.token && (
                <p className="text-gray-500">Please log in to see your orders.</p>
              )}
              {authSnapshot.token && authSnapshot.role && authSnapshot.role !== "customer" && (
                <p className="text-gray-500">
                  Order history is available for customer accounts. Use the website login to shop and track orders.
                </p>
              )}
              {authSnapshot.token && authSnapshot.role === "customer" && ordersLoading && (
                <p className="text-gray-500">Loading orders…</p>
              )}
              {authSnapshot.token && authSnapshot.role === "customer" && ordersError && (
                <p className="text-red-600">{ordersError}</p>
              )}
              {authSnapshot.token &&
                authSnapshot.role === "customer" &&
                !ordersLoading &&
                !ordersError &&
                orders.length === 0 && <p className="text-gray-500">No orders yet.</p>}
              {authSnapshot.token && authSnapshot.role === "customer" && orders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-xl border border-gray-200 bg-white/80 p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-[#5A272A]">Order {order.id.slice(0, 8)}…</span>
                    <span className="text-xs uppercase text-gray-500">{order.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {new Date(order.createdAt).toLocaleString()}
                  </p>
                  <ul className="mt-2 space-y-1 text-gray-600">
                    {order.items.map((line, idx) => (
                      <li key={`${order.id}-${idx}`}>
                        {line.product.name} × {line.quantity}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 font-semibold text-[#5A272A]">
                    Total: Rs.{Number(order.total).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center bg-[#F5F1E6] text-sm text-[#5A272A]">
          Loading…
        </div>
      }
    >
      <ProfilePageContent />
    </Suspense>
  )
}