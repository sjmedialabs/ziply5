"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Facebook, Twitter, Linkedin } from "lucide-react"
import { User, Star, Package } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { getFavoriteSlugs, toggleFavoriteSlug } from "@/lib/favorites"
import { addToCart, getCartItems, setCartItemQuantity } from "@/lib/cart"
import { useStorefrontProducts } from "@/hooks/useStorefrontProducts"
import { useRealtimeTables } from "@/hooks/useRealtimeTables"
import { clearSession } from "@/lib/auth-session"

type ApiOrderRow = {
  id: string
  status: string
  paymentStatus?: string | null
  refunds?: Array<{ status: string }>
  total: string | number
  createdAt: string
  items: Array<{ quantity: number; product: { name: string } }>
  transactions?: Array<{ status: string }>
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
  const [orderActionBusy, setOrderActionBusy] = useState<string | null>(null)
  const queryClient = useQueryClient()
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

  const ordersQuery = useQuery({
    queryKey: ["profile-orders"],
    enabled: activeTab === "orders" && Boolean(authSnapshot.token) && authSnapshot.role === "customer",
    queryFn: async () => {
      const token = window.localStorage.getItem("ziply5_access_token")
      if (!token) return []
      const res = await fetch("/api/v1/orders?page=1&limit=20", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = (await res.json()) as { success?: boolean; data?: { items: ApiOrderRow[] }; message?: string }
      if (!res.ok || !payload.success || !payload.data) throw new Error(payload.message ?? "Could not load orders.")
      return payload.data.items
    },
  })

  useEffect(() => {
    setOrders(ordersQuery.data ?? [])
  }, [ordersQuery.data])

  useRealtimeTables({
    tables: ["orders", "returns", "refunds"],
    onChange: () => {
      if (activeTab === "orders") {
        void queryClient.invalidateQueries({ queryKey: ["profile-orders"] })
      }
    },
  })

  const runOrderAction = async (orderId: string, action: "cancel_request" | "return_request" | "cancel_pending") => {
    const token = window.localStorage.getItem("ziply5_access_token")
    if (!token) return
    setOrderActionBusy(`${orderId}:${action}`)
    try {
      await fetch(`/api/v1/orders/${orderId}/actions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      })
    } finally {
      setOrderActionBusy(null)
      void queryClient.invalidateQueries({ queryKey: ["profile-orders"] })
    }
  }

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

  const moveFavoriteToCart = (product: (typeof favoriteProducts)[number]) => {
    setCartItemQuantity(product, 1)
    removeFavorite(product.slug)
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
      clearSession({ silent: true })
      router.push("/login")
    }
  }
const cancelPendingOrder = async (orderId: string) => {
  const token = window.localStorage.getItem("ziply5_access_token")
  if (!token) return

  setOrderActionBusy(`${orderId}:cancel`)

  try {
    await fetch(`/api/v1/orders/${orderId}/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
  } finally {
    setOrderActionBusy(null)
    void queryClient.invalidateQueries({ queryKey: ["profile-orders"] })
  }
}
  const sectionTitle =
    activeTab === "about"
      ? "Personal Information"
      : activeTab === "favorite"
        ? "wishlist"
        : "My orders"

  return (
    <div className="min-h-screen bg-[#f6f7fb] px-4 py-10 md:py-14">
      <div className="mx-auto w-full max-w-6xl">
        <h1 className="mb-6 text-2xl font-semibold text-[#111827]">My Account</h1>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-[280px_1fr]">

        {/* LEFT SIDEBAR */}
        <div
          className="w-full rounded-2xl bg-white p-2 shadow-sm ring-1 ring-black/5"
        >

          {/* TAB ITEM */}
          <div
            onClick={() => setActiveTab("about")}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "about" ? "bg-[#FDE2E7] text-[#7A1F2A]" : "text-[#374151] hover:bg-[#F3F4F6]"
            }`}
          >
            <User size={18} />
            <span className="font-medium">Personal Information</span>
          </div>

          <div
            onClick={() => setActiveTab("favorite")}
            className={`mt-1 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "favorite" ? "bg-[#FDE2E7] text-[#7A1F2A]" : "text-[#374151] hover:bg-[#F3F4F6]"
            }`}
          >
            <Star size={18} />
            <span className="font-medium">wishlist</span>
          </div>

          <div
            onClick={() => setActiveTab("orders")}
            className={`mt-1 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "orders" ? "bg-[#FDE2E7] text-[#7A1F2A]" : "text-[#374151] hover:bg-[#F3F4F6]"
            }`}
          >
            <Package size={18} />
            <span className="font-medium">My orders</span>
          </div>
        </div>

        {/* RIGHT CONTENT */}
        <div className="w-full">
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
            <div className="flex flex-col gap-3 border-b border-black/5 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-base font-semibold text-[#111827]">{sectionTitle}</p>
                <p className="mt-0.5 text-xs text-[#6B7280]">Manage your account details and preferences.</p>
              </div>
            <button
              type="button"
              onClick={handleLogout}
                className="h-10 rounded-xl bg-[#5A272A] px-4 text-xs font-semibold uppercase tracking-wide text-white hover:bg-[#451f21]"
            >
              Logout
            </button>
          </div>

            <div className="p-5">
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
                <p className="w-24 font-bold text-gray-700">Support</p>
                <Link href="/support" className="text-orange-600 underline hover:text-orange-700">
                  Open support center
                </Link>
              </div>

              <div className="flex">
                <p className="w-24 font-bold text-gray-700">Returns</p>
                <Link href="/my-returns" className="text-orange-600 underline hover:text-orange-700">
                  Track return/replace
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
                <>
                  <div className="mb-5 flex items-center justify-between">
                    <p className="text-base font-semibold text-[#111827]">Wishlist ({favoriteProducts.length})</p>
                    <button
                      type="button"
                      onClick={() => {
                        favoriteProducts.forEach((p) => {
                          setCartItemQuantity(p, 1)
                          removeFavorite(p.slug)
                        })
                      }}
                      className="rounded-md border border-[#D1D5DB] bg-white px-4 py-2 text-xs font-medium text-[#111827] hover:bg-[#F9FAFB]"
                    >
                      Move all to cart
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {favoriteProducts.map((product) => (
                      <article
                        key={product.slug}
                        className="rounded-xl border border-[#E5E7EB] bg-white p-3 shadow-sm transition hover:shadow-md"
                      >
                        <div className="relative rounded-md bg-[#F8F9FB] p-3">
                          <button
                            type="button"
                            onClick={() => removeFavorite(product.slug)}
                            className="absolute right-2 top-2 h-7 w-7 rounded-full border border-[#E5E7EB] bg-white text-sm text-[#6B7280]"
                            aria-label="Remove from wishlist"
                          >
                            ×
                          </button>
                          <Link href={`/product/${product.slug}`} className="block">
                            <div className="relative mx-auto h-[140px] w-full max-w-[130px]">
                              <Image src={product.image} alt={product.name} fill className="object-contain" />
                            </div>
                          </Link>
                        </div>

                        <h3 className="mt-3 line-clamp-2 text-sm font-semibold text-[#111827]">{product.name}</h3>
                        <p className="mt-1 text-xs text-[#6B7280]">Net wt. {product.weight}</p>
                        <p className="mt-2 text-sm font-semibold text-[#B91C1C]">Rs.{Number(product.price).toFixed(2)}</p>

                        <div className="mt-3 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              moveFavoriteToCart(product)
                            }}
                            className="rounded-md border border-[#D1D5DB] px-3 py-1.5 text-xs font-medium text-[#111827] hover:bg-[#F9FAFB]"
                          >
                            Move to cart
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
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
              {authSnapshot.token && authSnapshot.role === "customer" && ordersQuery.isLoading && (
                <p className="text-gray-500">Loading orders…</p>
              )}
              {authSnapshot.token && authSnapshot.role === "customer" && ordersQuery.error && (
                <p className="text-red-600">{ordersQuery.error instanceof Error ? ordersQuery.error.message : "Could not load orders."}</p>
              )}
              {authSnapshot.token &&
                authSnapshot.role === "customer" &&
                !ordersQuery.isLoading &&
                !ordersQuery.error &&
                orders.length === 0 && <p className="text-gray-500">No orders yet.</p>}
              {authSnapshot.token && authSnapshot.role === "customer" && orders.map((order) => {
                const paymentStatus = order.paymentStatus ?? (order.transactions?.some((tx) => tx.status === "paid") ? "paid" : "pending")
                return (<div
                  key={order.id}
                  className="rounded-xl border border-gray-200 bg-white/80 p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-[#5A272A]">Order {order.id.slice(0, 8)}…</span>
                    <span className="text-xs uppercase text-gray-500">{order.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Payment: {order.paymentStatus ?? (order.transactions?.some((tx) => tx.status === "paid") ? "paid" : "pending")}
                  </p>
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
                  {(<p className="mt-1 text-xs text-[#646464]">
                    Refund status: {(order.refunds?.[0]?.status ?? "pending").toUpperCase()}
                  </p>)}
                  <div className="flex gap-1">
                  {paymentStatus.toLowerCase() === "pending" && order.status.toLowerCase() === "pending" && (
                <button className="mt-2 rounded-md border border-[#E8DCC8] bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#4A1D1F]" type="button"  onClick={() => void runOrderAction(order.id, "cancel_pending")}>
                     Cancel Order
                    </button>
                  )}
                  {paymentStatus.toLowerCase() === "pending" && (
                    <button   className="mt-2 rounded-md border border-[#E8DCC8] bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#4A1D1F]" type="button" >
                      Pay Now
                    </button>
                  )}
                  {(order.paymentStatus ?? "").toUpperCase() === "SUCCESS" &&
                    ["confirmed", "packed"].includes(order.status.toLowerCase()) && (
                      <button
                        type="button"
                        disabled={orderActionBusy === `${order.id}:cancel_request`}
                        onClick={() => void runOrderAction(order.id, "cancel_request")}
                        className="mt-2 rounded-md border border-[#E8DCC8] bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#4A1D1F] disabled:opacity-40"
                      >
                        Cancel order
                      </button>
                    )}
                  {order.status.toLowerCase() === "delivered" && (
                    <button
                      type="button"
                      disabled={orderActionBusy === `${order.id}:return_request`}
                      onClick={() => void runOrderAction(order.id, "return_request")}
                      className="mt-2 ml-2 rounded-md border border-[#E8DCC8] bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#4A1D1F] disabled:opacity-40"
                    >
                      Return order
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => router.push(`/orders/${order.id}`)}
                    className="mt-2 rounded-md border border-[#E8DCC8] bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#4A1D1F]"
                  >
                    View details
                  </button>
                  </div>
                </div>)
              })}
            </div>
          )}
            </div>
          </div>
        </div>

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