"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Facebook, Twitter, Linkedin } from "lucide-react"
import { User, Star, Package } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { products } from "@/lib/products"
import { getFavoriteSlugs, toggleFavoriteSlug } from "@/lib/favorites"
import { addToCart, getCartItems, setCartItemQuantity } from "@/lib/cart"

export default function ProfilePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialTab = searchParams.get("tab")
  const [activeTab, setActiveTab] = useState("about")
  const [favoriteSlugs, setFavoriteSlugs] = useState<string[]>([])
  const [cartQtyBySlug, setCartQtyBySlug] = useState<Record<string, number>>({})

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
        serving: "440 calories serving",
        weight: "95 g",
        description: "Favourite product",
        type: "non-veg" as const,
        category: "ready-to-eat" as const,
        image: "/assets/product listing/Ziply5 - Pouch - Butter Chk Rice 3.png",
        detailImage: "/assets/Product details/pdp-main.png",
        bgColor: "#3EA6CF",
        gallery: [],
      }
    })
  }, [favoriteSlugs])

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
                      style={{ backgroundColor: product.bgColor }}
                    >
                      <span className="absolute right-3 top-3 text-lg text-white">♥</span>
                      <Link href={`/product/${product.slug}`} className="block">
                        <div className="relative mx-auto h-[200px] w-full max-w-[130px]">
                          <Image src={product.image} alt={product.name} fill className="object-contain" />
                        </div>
                        <h3 className="mt-2 text-center text-[18px] font-black uppercase leading-tight text-white">{product.name}</h3>
                        <p className="mt-1 text-center text-[10px] font-semibold uppercase text-white/90">
                          {product.serving} | Net wt. {product.weight}
                        </p>
                      </Link>
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => removeFavorite(product.slug)}
                          className="rounded-md bg-white/85 py-1 text-[10px] font-semibold uppercase text-[#5A272A]"
                        >
                          Remove
                        </button>
                        <div className="col-span-2 rounded-md bg-white/85 px-2 py-1">
                          <p className="text-center text-[9px] font-semibold uppercase text-[#5A272A]">Add to cart</p>
                          <div className="mt-1 flex items-center justify-between rounded-md border border-[#d5c4b8] bg-white px-1 py-0.5">
                            <button
                              type="button"
                              onClick={() => updateCartQty(product, -1)}
                              className="h-5 w-5 rounded text-sm font-bold text-[#5A272A] hover:bg-[#f4efec]"
                            >
                              -
                            </button>
                            <span className="text-xs font-bold text-[#5A272A]">{cartQtyBySlug[product.slug] ?? 0}</span>
                            <button
                              type="button"
                              onClick={() => updateCartQty(product, 1)}
                              className="h-5 w-5 rounded text-sm font-bold text-[#5A272A] hover:bg-[#f4efec]"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
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
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === "orders" && (
            <p className="text-gray-500">No orders yet.</p>
          )}
        </div>

      </div>
    </div>
  )
}