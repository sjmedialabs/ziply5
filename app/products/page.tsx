"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { products } from "@/lib/products"
import { getCartItems, setCartItemQuantity } from "@/lib/cart"
import { getFavoriteSlugs, toggleFavoriteSlug } from "@/lib/favorites"

type CategoryFilter = "all" | "ready-to-eat" | "ready-to-cook"
type MealTypeFilter = "all" | "veg" | "non-veg"
type SortType = "popular" | "name-asc" | "name-desc"

export default function ProductsPage() {
  const searchParams = useSearchParams()
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all")
  const [mealTypeFilter, setMealTypeFilter] = useState<MealTypeFilter>("all")
  const [sortBy, setSortBy] = useState<SortType>("popular")
  const [favoriteSlugs, setFavoriteSlugs] = useState<string[]>([])
  const [cartQtyBySlug, setCartQtyBySlug] = useState<Record<string, number>>({})
  const searchTerm = (searchParams.get("search") || "").trim().toLowerCase()

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
    const items = products.filter((item) => {
      const categoryMatch = categoryFilter === "all" || item.category === categoryFilter
      const typeMatch = mealTypeFilter === "all" || item.type === mealTypeFilter
      return categoryMatch && typeMatch
    })

    const searched = searchTerm ? items.filter((item) => item.name.toLowerCase().includes(searchTerm)) : items

    if (sortBy === "name-asc") {
      return [...searched].sort((a, b) => a.name.localeCompare(b.name))
    }

    if (sortBy === "name-desc") {
      return [...searched].sort((a, b) => b.name.localeCompare(a.name))
    }

    return searched
  }, [categoryFilter, mealTypeFilter, sortBy, searchTerm])

  return (
    <section className="w-full bg-[#F3F0DC] py-8 md:py-10">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4">
          {searchTerm && (
            <p className="text-sm font-medium text-[#5A272A]">
              Search results for "<span className="font-bold">{searchTerm}</span>" ({filteredProducts.length})
            </p>
          )}

          <div className="rounded-2xl border border-[#E6DFC4] bg-white/70 p-3 md:p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-[#1F1F1C]">Filter Products</p>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as CategoryFilter)}>
                  <SelectTrigger className="h-10 w-full min-w-[190px] rounded-full border-[#D9D9D1] bg-white px-4 text-sm font-medium text-[#494944]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="ready-to-eat">Ready To Eat</SelectItem>
                    <SelectItem value="ready-to-cook">Ready To Cook</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={mealTypeFilter} onValueChange={(value) => setMealTypeFilter(value as MealTypeFilter)}>
                  <SelectTrigger className="h-10 w-full min-w-[190px] rounded-full border-[#D9D9D1] bg-white px-4 text-sm font-medium text-[#494944]">
                    <SelectValue placeholder="Meal Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="veg">Veg</SelectItem>
                    <SelectItem value="non-veg">Non-Veg</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={sortBy}
                  onValueChange={(value) => setSortBy(value as SortType)}
                >
                  <SelectTrigger className="h-10 w-full min-w-[190px] rounded-full border-[#D9D9D1] bg-white px-4 text-sm font-medium text-[#494944]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popular">Popular</SelectItem>
                    <SelectItem value="name-asc">Name: A-Z</SelectItem>
                    <SelectItem value="name-desc">Name: Z-A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-[#F3EADF] px-3 py-1 text-[#5A272A]">
                Category: {categoryFilter === "all" ? "All" : categoryFilter.replaceAll("-", " ")}
              </span>
              <span className="rounded-full bg-[#F3EADF] px-3 py-1 text-[#5A272A]">
                Type: {mealTypeFilter === "all" ? "All" : mealTypeFilter}
              </span>
              <button
                onClick={() => {
                  setCategoryFilter("all")
                  setMealTypeFilter("all")
                  setSortBy("popular")
                }}
                className="rounded-full bg-[#7A2B19] px-3 py-1 text-white"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-[#1F1F1C]">
              Showing {filteredProducts.length} products
            </p>
            <div className="hidden items-center gap-2 text-xs md:flex">
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
