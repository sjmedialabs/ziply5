"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { products } from "@/lib/products"
import { getCartItems, setCartItemQuantity } from "@/lib/cart"
import { getFavoriteSlugs, toggleFavoriteSlug } from "@/lib/favorites"

const filterItems = [
  { id: "all", label: "All" },
  { id: "veg", label: "Veg" },
  { id: "non-veg", label: "Non-Veg / Meat Meals" },
  { id: "ready-to-eat", label: "Ready To Eat Meals" },
  { id: "ready-to-cook", label: "Ready To Cook Meals" },
] as const

type FilterType = (typeof filterItems)[number]["id"]
type SortType = "popular" | "name-asc" | "name-desc"

export default function ProductsPage() {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all")
  const [sortBy, setSortBy] = useState<SortType>("popular")
  const [favoriteSlugs, setFavoriteSlugs] = useState<string[]>([])
  const [cartQtyBySlug, setCartQtyBySlug] = useState<Record<string, number>>({})

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

  const filteredProducts = useMemo(() => {
    const items =
      activeFilter === "all"
        ? products
        : products.filter((item) => item.type === activeFilter || item.category === activeFilter)

    if (sortBy === "name-asc") {
      return [...items].sort((a, b) => a.name.localeCompare(b.name))
    }

    if (sortBy === "name-desc") {
      return [...items].sort((a, b) => b.name.localeCompare(a.name))
    }

    return items
  }, [activeFilter, sortBy])

  return (
    <section className="w-full bg-[#F3F0DC] py-8 md:py-10">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            {filterItems.map((item) => {
              const isActive = activeFilter === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveFilter(item.id)}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold tracking-wide transition-all md:px-5 ${
                    isActive
                      ? "border-[#7A2B19] bg-[#7A2B19] text-white"
                      : "border-[#DADAD6] bg-white text-[#6B6B66] hover:border-[#7A2B19] hover:text-[#7A2B19]"
                  }`}
                >
                  {item.label}
                </button>
              )
            })}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-[#1F1F1C]">Filtered By</p>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-[#7F7F7A]">Sort by</span>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as SortType)}
                className="rounded-full border border-[#D9D9D1] bg-white px-3 py-1.5 font-medium text-[#494944] outline-none"
              >
                <option value="popular">Popular</option>
                <option value="name-asc">Name: A-Z</option>
                <option value="name-desc">Name: Z-A</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => (
            <article
              key={product.id}
              className="group relative rounded-2xl border-2 border-transparent p-4 pb-12 transition-all duration-300 hover:border-[#F0E4A3] hover:shadow-[0_14px_28px_rgba(34,26,18,0.18)]"
              style={{ backgroundColor: product.bgColor }}
            >
              <button
                type="button"
                onClick={() => {
                  toggleFavoriteSlug(product.slug)
                  setFavoriteSlugs(getFavoriteSlugs())
                }}
                className="absolute left-3 top-3 z-20 text-lg text-white"
              >
                {favoriteSlugs.includes(product.slug) ? "♥" : "♡"}
              </button>

              <Link href={`/product/${product.slug}`} className="block">
                <div className="absolute right-3 top-3">
                  <span
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-sm border ${
                      product.type === "veg" ? "border-[#148B2E]" : "border-[#A32424]"
                    }`}
                  >
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        product.type === "veg" ? "bg-[#148B2E]" : "bg-[#A32424]"
                      }`}
                    />
                  </span>
                </div>

                <div className="relative mx-auto h-[280px] w-full max-w-[190px] transition-transform duration-300 group-hover:scale-90">
                  <Image src={product.image} alt={product.name} fill className="object-contain" />
                </div>

                <div className="mt-2 text-center">
                  <h3 className="text-[18px] font-black uppercase leading-tight text-white drop-shadow-[0_1px_0_rgba(0,0,0,0.2)]">
                    {product.name}
                  </h3>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-white/90">
                    Home style rice | Net wt. {product.weight}
                  </p>
                </div>
              </Link>

              <div className="absolute bottom-3 left-4 right-4 rounded-md bg-white/85 px-2 py-1 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <p className="text-center text-[9px] font-semibold uppercase text-[#5A272A]">Add to cart</p>
                <div className="mt-1 flex items-center justify-between rounded-md border border-[#d5c4b8] bg-white px-1 py-0.5">
                  <button
                    type="button"
                    onClick={() => setCartItemQuantity(product, Math.max(0, (cartQtyBySlug[product.slug] ?? 0) - 1))}
                    className="h-5 w-5 rounded text-sm font-bold text-[#5A272A] hover:bg-[#f4efec]"
                  >
                    -
                  </button>
                  <span className="text-xs font-bold text-[#5A272A]">{cartQtyBySlug[product.slug] ?? 0}</span>
                  <button
                    type="button"
                    onClick={() => setCartItemQuantity(product, (cartQtyBySlug[product.slug] ?? 0) + 1)}
                    className="h-5 w-5 rounded text-sm font-bold text-[#5A272A] hover:bg-[#f4efec]"
                  >
                    +
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
