"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Facebook, Twitter, Linkedin, X } from "lucide-react"
import { User, Star, Package } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query"
import { getFavoriteSlugs, toggleFavoriteSlug } from "@/lib/favorites"
import { addToCart, getCartItems, setCartItemQuantity } from "@/lib/cart"
import { useStorefrontProducts } from "@/hooks/useStorefrontProducts"
import { useRealtimeTables } from "@/hooks/useRealtimeTables"
import { clearSession } from "@/lib/auth-session"
import { toast } from "@/lib/toast"

type ApiOrderRow = {
  id: string
  status: string
  paymentStatus?: string | null
  customerName?: string | null
  customerPhone?: string | null
  customerAddress?: string | null
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
  const [isManageModalOpen, setIsManageModalOpen] = useState(false)
  const [editForm, setEditForm] = useState({ name: "", bio: "", phone: "" })
  const [authSnapshot, setAuthSnapshot] = useState<{ token: string | null; role: string | null }>({
    token: null,
    role: null,
  })

  useEffect(() => {
    if (initialTab === "favorite" || initialTab === "about" || initialTab === "orders") {
      setActiveTab(initialTab)
    }
  }, [initialTab])

  // Fetch User Profile Data
  const profileQuery = useQuery({
    queryKey: ["user-profile"],
    enabled: Boolean(authSnapshot.token),
    queryFn: async () => {
      const token = window.localStorage.getItem("ziply5_access_token");
      const userId = JSON.parse(window.localStorage.getItem("ziply5_user") || "{}").id;
      const res = await fetch("/api/v1/profile", {
        headers: { 
          Authorization: `Bearer ${token}`,
          "x-user-id": userId 
        },
      });
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.message || "Failed to load profile");
      return payload.data;
    },
  });

  useEffect(() => {
    if (profileQuery.data) {
      setEditForm({
        name: profileQuery.data.name || "",
        bio: profileQuery.data.profile?.bio || "",
        phone: profileQuery.data.profile?.phone || "",
      })
    }
  }, [profileQuery.data])

  const updateProfileMutation = useMutation({
    mutationFn: async (payload: typeof editForm) => {
      const token = window.localStorage.getItem("ziply5_access_token")
      const userId = JSON.parse(window.localStorage.getItem("ziply5_user") || "{}").id
      const res = await fetch("/api/v1/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-user-id": userId,
        },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.message)
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["user-profile"] })
      setIsManageModalOpen(false)
    },
  })

  const deleteProfileMutation = useMutation({
    mutationFn: async () => {
      const token = window.localStorage.getItem("ziply5_access_token")
      const userId = JSON.parse(window.localStorage.getItem("ziply5_user") || "{}").id
      const res = await fetch("/api/v1/profile", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-user-id": userId,
        },
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.message)
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["user-profile"] })
      setIsManageModalOpen(false)
    },
  })

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
    const fetchDbFavorites = async () => {
      if (!authSnapshot.token) return;
      const userId = JSON.parse(window.localStorage.getItem("ziply5_user") || "{}").id;
      if (!userId) return;

      try {
        const res = await fetch("/api/v1/favorites", {
          headers: { 
            Authorization: `Bearer ${authSnapshot.token}`,
            "x-user-id": userId 
          },
        });
        const payload = await res.json();
        if (payload.success && Array.isArray(payload.data)) {
          window.localStorage.setItem("ziply5-favorites", JSON.stringify(payload.data));
          setFavoriteSlugs(payload.data);
        }
      } catch (e) { /* ignore */ }
    };
    fetchDbFavorites();
  }, [authSnapshot.token]);

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

  const removeFavorite = async (slug: string) => {
    await toggleFavoriteSlug(slug)
    toast.info("Removed from wishlist", "The item has been removed from your favorites list.")
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
  return (
    <div className="min-h-screen bg-[#f6f0dc] py-10 md:py-16 px-4">
      <div className="max-w-5xl mx-auto md:flex gap-30">

        {/* LEFT SIDEBAR */}
        <div>
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
            className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-3 px-3 md:px-5 py-4 cursor-pointer border-b md:border-b ${activeTab === "about"
                ? "bg-white text-orange-500 md:border-r-4 shadow-[inset_-4px_0_6px_rgba(0,0,0,0.1)] border-orange-500"
                : "text-gray-400"
              }`}
          >
            <User size={18} />
            <span className="font-medium">About Me</span>
          </div>

          <div
            onClick={() => setActiveTab("favorite")}
            className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-3 px-3 md:px-5 py-4 cursor-pointer border-b md:border-b ${activeTab === "favorite"
                ? "bg-white text-orange-500 md:border-r-4 shadow-[inset_-4px_0_6px_rgba(0,0,0,0.1)] border-orange-500"
                : "text-gray-400"
              }`}
          >
            <Star size={18} />
            <span className="font-medium">Favorite</span>
          </div>

          <div
            onClick={() => setActiveTab("orders")}
            className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-3 px-3 md:px-5 py-4 cursor-pointer ${activeTab === "orders"
                ? "bg-white text-orange-500 md:border-r-4 shadow-[inset_-4px_0_6px_rgba(0,0,0,0.1)] border-orange-500"
                : "text-gray-400"
              }`}
          >
            <Package size={18} />
            <span className="font-medium">Order history</span>
          </div>
        </div>
        </div>
        {/* RIGHT CONTENT */}
        <div className="flex-1 mt-6 md:mt-0">

          {activeTab === "about" && (
            <div className="space-y-6 text-sm gap-2">

              <div className="flex">
                <p className="w-24 font-bold text-gray-700">Bio</p>
                <p className="text-gray-600 max-w-md italic">
                  {profileQuery.data?.profile?.bio || "No bio set yet. Click edit to add one!"}
                </p>
              </div>

              <div className="flex">
                <p className="w-24 font-bold text-gray-700">Email</p>
                <p className="text-gray-600">{profileQuery.data?.email || "Loading..."}</p>
              </div>

              <div className="flex">
                <p className="w-24 font-bold text-gray-700">Contact</p>
                <p className="text-gray-600">{profileQuery.data?.profile?.phone || "Not provided"}</p>
              </div>
              <div className="flex">
                <p className="w-24 font-bold text-gray-700">Address</p>
                <p className="text-gray-600">
                  {profileQuery.data?.addresses?.[0]?.line1 || "No primary address set."}
                </p>
              </div>
              <div className="flex">
                <p className="w-24 font-bold text-gray-700">Addresses</p>
                <Link href="/addresses" className="text-orange-600 underline hover:text-orange-700">
                  Manage saved addresses
                </Link>
              </div>

              {/* <div className="flex">
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
              </div> */}
            <div className="flex justify-between items-center w-full">
              <button
                onClick={() => setIsManageModalOpen(true)}
                className="mt-4 text-xs font-bold text-primary underline uppercase tracking-widest"
              >
                Manage Profile
              </button>
                        <div className="">
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md bg-[#5A272A] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-[#451f21]"
            >
              Logout
            </button>
          </div>
          </div>

              {/* SOCIAL */}
              {/* <div className="flex items-center">
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
              </div> */}

            </div>
          )}

          {/* MANAGE PROFILE MODAL */}
          {isManageModalOpen && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setIsManageModalOpen(false)}>
              <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between bg-primary p-5 text-white">
                  <h3 className="font-melon text-lg font-bold uppercase tracking-wider">Manage Profile</h3>
                  <button onClick={() => setIsManageModalOpen(false)} className="rounded-full bg-white/20 p-1 hover:bg-white/30 transition-colors">
                    <X size={20} />
                  </button>
                </div>
                
                <form className="p-6 space-y-4" onSubmit={(e) => {
                  e.preventDefault()
                  updateProfileMutation.mutate(editForm)
                }}>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Full Name</label>
                    <input 
                      type="text" 
                      value={editForm.name}
                      onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Bio</label>
                    <textarea 
                      rows={3}
                      value={editForm.bio}
                      onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Contact Phone</label>
                    <input 
                      type="text" 
                      value={editForm.phone}
                      onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={updateProfileMutation.isPending}
                      className="flex-1 rounded-xl bg-primary py-4 text-xs font-bold uppercase tracking-widest text-white shadow-lg hover:opacity-90 disabled:opacity-50 transition-all"
                    >
                      {updateProfileMutation.isPending ? "Updating..." : "Update Profile"}
                    </button>
                    {/* <button
                      type="button"
                      disabled={deleteProfileMutation.isPending}
                      onClick={() => {
                        if (confirm("Are you sure you want to clear your profile data?")) {
                          deleteProfileMutation.mutate()
                        }
                      }}
                      className="px-4 rounded-xl border-2 border-red-100 text-red-500 text-[10px] font-bold uppercase tracking-widest hover:bg-red-50 transition-all"
                    >
                      Delete
                    </button> */}
                  </div>
                </form>
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
                      <span className="absolute right-3 top-3 text-lg text-white" onClick={() => removeFavorite(product.slug)}>
                        ♥
                      </span>
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
                const previewItems = order.items.slice(0, 2)
                const moreItems = Math.max(order.items.length - 2, 0)
                return (<div
                  key={order.id}
                  className="rounded-2xl border border-[#E8DCC8] bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-[11px] uppercase tracking-[0.15em] text-[#8A6A52]">Order {order.id.slice(0, 8)}</p>
                      <p className="text-xs text-[#646464]">
                        Order created on {new Date(order.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <span className="rounded-full bg-[#FDF0E6] px-2.5 py-1 text-[10px] font-semibold uppercase text-[#7B3010]">
                      {order.status}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1 text-sm text-[#2A1810]">
                    {previewItems.map((line, idx) => (
                      <p key={`${order.id}-${idx}`}>{line.product.name}</p>
                    ))}
                    {moreItems > 0 && <p className="text-xs text-[#646464]">+{moreItems} more items</p>}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-[#5A272A]">Rs. {Number(order.total).toFixed(2)}</p>
                    {/* <span className="rounded-full border border-[#E8DCC8] px-2.5 py-1 text-[10px] font-semibold uppercase text-[#4A1D1F]">
                      {paymentStatus}
                    </span> */}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {paymentStatus.toLowerCase() === "pending" && order.status.toLowerCase() === "pending" && (
                      <button className="rounded-md border border-[#E8DCC8] bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#4A1D1F]" type="button" onClick={() => void runOrderAction(order.id, "cancel_pending")}>
                        Cancel Order
                      </button>
                    )}
                    {paymentStatus.toLowerCase() === "pending" && (
                      <button
                        className="rounded-md border border-[#E8DCC8] bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#4A1D1F]"
                        type="button"
                        onClick={() =>
                          router.push(
                            `/payment?orderId=${encodeURIComponent(order.id)}&amount=${encodeURIComponent(String(order.total ?? ""))}&name=${encodeURIComponent(order.customerName ?? "")}&phone=${encodeURIComponent(order.customerPhone ?? "")}&address=${encodeURIComponent(order.customerAddress ?? "")}`,
                          )
                        }
                      >
                        Pay Now
                      </button>
                    )}
                    {(order.paymentStatus ?? "").toUpperCase() === "SUCCESS" &&
                      ["confirmed", "packed"].includes(order.status.toLowerCase()) && (
                        <button
                          type="button"
                          disabled={orderActionBusy === `${order.id}:cancel_request`}
                          onClick={() => void runOrderAction(order.id, "cancel_request")}
                          className="rounded-md border border-[#E8DCC8] bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#4A1D1F] disabled:opacity-40"
                        >
                          Cancel order
                        </button>
                      )}
                    {order.status.toLowerCase() === "delivered" && (
                      <button
                        type="button"
                        disabled={orderActionBusy === `${order.id}:return_request`}
                        onClick={() => void runOrderAction(order.id, "return_request")}
                        className="rounded-md border border-[#E8DCC8] bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#4A1D1F] disabled:opacity-40"
                      >
                        Return order
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => router.push(`/orders/${order.id}`)}
                      className="ml-auto rounded-md bg-[#5A272A] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white"
                    >
                      View details →
                    </button>
                  </div>
                </div>)
              })}
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