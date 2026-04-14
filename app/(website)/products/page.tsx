"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { products } from "@/lib/products"
import { getCartItems, setCartItemQuantity, setCartItems } from "@/lib/cart"
import { getFavoriteSlugs, toggleFavoriteSlug } from "@/lib/favorites"

type CategoryFilter = "all" | "ready-to-eat" | "ready-to-cook"
type MealTypeFilter = "all" | "veg" | "non-veg"
type SortType = "popular" | "newest" | "price-low-high" | "price-high-low" | "name-asc" | "name-desc"
type PackFilter = "all" | "combo-pack" | "limited-offers"
type MealTimeFilter = "all" | "breakfast" | "lunch" | "dinner"
type AvailabilityFilter = "all" | "in-stock" | "out-of-stock"

function ProductsPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all")
  const [mealTypeFilter, setMealTypeFilter] = useState<MealTypeFilter>("all")
  const [packFilter, setPackFilter] = useState<PackFilter>("all")
  const [mealTimeFilter, setMealTimeFilter] = useState<MealTimeFilter>("all")
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>("all")
  const [sortBy, setSortBy] = useState<SortType>("popular")
  const [favoriteSlugs, setFavoriteSlugs] = useState<string[]>([])
  const [cartQtyBySlug, setCartQtyBySlug] = useState<Record<string, number>>({})
  const searchTerm = (searchParams.get("search") || "").trim().toLowerCase()
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000])
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
      const packMatch =
        packFilter === "all" ||
        (packFilter === "combo-pack" && (item as any).isCombo) ||
        (packFilter === "limited-offers" && (item as any).isLimited)
      const mealTimeMatch = mealTimeFilter === "all" || (item as any).mealTime === mealTimeFilter
      const availabilityMatch =
        availabilityFilter === "all" ||
        (availabilityFilter === "in-stock" && (item as any).inStock !== false) ||
        (availabilityFilter === "out-of-stock" && (item as any).inStock === false)
      const priceMatch =
        item.price >= priceRange[0] && item.price <= priceRange[1]
      return categoryMatch && typeMatch && packMatch && mealTimeMatch && availabilityMatch && priceMatch
    })

    const searched = searchTerm ? items.filter((item) => item.name.toLowerCase().includes(searchTerm)) : items

    let sorted = [...searched]
    if (sortBy === "name-asc") sorted.sort((a, b) => a.name.localeCompare(b.name))
    else if (sortBy === "name-desc") sorted.sort((a, b) => b.name.localeCompare(a.name))
    else if (sortBy === "newest") sorted.sort((a, b) => (b.id || 0) - (a.id || 0))
    else if (sortBy === "price-low-high") sorted.sort((a, b) => a.price - b.price)
    else if (sortBy === "price-high-low") sorted.sort((a, b) => b.price - a.price)

    return sorted
  }, [categoryFilter, mealTypeFilter, packFilter, mealTimeFilter, availabilityFilter, sortBy, searchTerm])

  const handleBuyNow = (product: any) => {
    setCartItems([{ ...product, quantity: 1 }])
    router.push("/checkout")
  }

  return (
    <section className="w-full bg-[#F3F0DC] py-8 md:py-10">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4">
          {searchTerm && (
            <p className="text-sm font-medium text-[#5A272A]">
              Search results for "<span className="font-bold">{searchTerm}</span>" ({filteredProducts.length})
            </p>
          )}

          <div className="p-3 md:p-4 bg-white/40 rounded-3xl">
            <div className="flex flex-col gap-4">
              <p className="text-xs font-bold uppercase tracking-wide text-[#1F1F1C]">Filtered Products By</p>
              <div className="flex flex-row gap-4 items-center">
                {/* sort or filter by product type */}
                <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as CategoryFilter)}>
                  <SelectTrigger className="w-full rounded-full border-[#D9D9D1] bg-white px-4 text-sm font-medium text-[#494944]">
                    <SelectValue placeholder="Product" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="ready-to-eat">Ready to eat meals</SelectItem>
                    <SelectItem value="ready-to-cook">Ready-to-cook meals</SelectItem>
                  </SelectContent>
                </Select>
                {/* Sort by type  */}
                <Select value={mealTypeFilter} onValueChange={(value) => setMealTypeFilter(value as MealTypeFilter)}>
                  <SelectTrigger className="w-full rounded-full border-[#D9D9D1] bg-white px-4 text-sm font-medium text-[#494944]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="veg">Veg</SelectItem>
                    <SelectItem value="non-veg">Non-Veg</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={packFilter} onValueChange={(value) => setPackFilter(value as PackFilter)}>
                  <SelectTrigger className="w-full rounded-full border-[#D9D9D1] bg-white px-4 text-sm font-medium text-[#494944]">
                    <SelectValue placeholder="Packs & Deals" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Packs</SelectItem>
                    <SelectItem value="combo-pack">Combo Pack</SelectItem>
                    <SelectItem value="limited-offers">Limited Offers</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={mealTimeFilter} onValueChange={(value) => setMealTimeFilter(value as MealTimeFilter)}>
                  <SelectTrigger className="w-full rounded-full border-[#D9D9D1] bg-white px-4 text-sm font-medium text-[#494944]">
                    <SelectValue placeholder="Meal Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Meal Types</SelectItem>
                    <SelectItem value="breakfast">Breakfast</SelectItem>
                    <SelectItem value="lunch">Lunch</SelectItem>
                    <SelectItem value="dinner">Dinner</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={availabilityFilter} onValueChange={(value) => setAvailabilityFilter(value as AvailabilityFilter)}>
                  <SelectTrigger className="w-full rounded-full border-[#D9D9D1] bg-white px-4 text-sm font-medium text-[#494944]">
                    <SelectValue placeholder="Availability" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Availability</SelectItem>
                    <SelectItem value="in-stock">In Stock</SelectItem>
                    <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
                                {/* Sort by popular , a-z or Z o A */}
                                <div>
                <Select
                  value={sortBy}
                  onValueChange={(value) => setSortBy(value as SortType)}
                >
                  <SelectTrigger className="w-full rounded-full border-[#D9D9D1] bg-white px-4 text-sm font-medium text-[#494944]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popular">Popular</SelectItem>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="price-low-high">Price: Low to High</SelectItem>
                    <SelectItem value="price-high-low">Price: High to Low</SelectItem>
                  </SelectContent>
                </Select>
                {sortBy === "price-low-high" || sortBy === "price-high-low" && (<div className="flex gap-2 mt-1 items-center">
                  <input
                    type="number"
                    placeholder="Min"
                    className="w-20 border px-2 py-1 rounded-full"
                    onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    className="w-20 rounded-full border px-2 py-1"
                    onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                  />
                </div>)}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
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
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-[#1F1F1C]">
              Showing {filteredProducts.length} products
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full text-center py-20">
              <h2 className="text-xl font-semibold text-[#5A272A]">
                No products available
              </h2>
              <p className="text-sm text-gray-500 mt-2">
                Try changing filters or search
              </p>
            </div>
          ) : (
            filteredProducts.map((product) => (
              <article
                key={product.id}
                className="group relative rounded-2xl border-2 border-transparent p-4 transition-all duration-300 hover:ring-4 hover:ring-[#F36E21] hover:shadow-xl]"
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
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-sm border ${product.type === "veg" ? "border-[#148B2E]" : "border-[#A32424]"
                        }`}
                    >
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${product.type === "veg" ? "bg-[#148B2E]" : "bg-[#A32424]"
                          }`}
                      />
                    </span>
                  </div>

                  <div className="relative mx-auto h-[280px] w-full max-w-[190px] transition-transform duration-300 hover:scale-90">
                    <Image src={product.image} alt={product.name} fill className="object-contain" />
                  </div>

                  <div className="mt-2 text-center tracking-wide font-light font-melon">
                    <h3 className="text-[18px] uppercase leading-tight text-white drop-shadow-[0_1px_0_rgba(0,0,0,0.2)]">
                      {product.name}
                    </h3>
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-white/90">
                      Home style rice | Net wt. {product.weight}
                    </p>
                    <p className="mt-1 text-sm font-melon text-[#FFF5C5]">Rs. {product.price.toFixed(2)}</p>
                  </div>
                </Link>

                <div className="mt-3 flex items-center justify-between gap-2 font-melon tracking-wide font-light">
                  {(cartQtyBySlug[product.slug] ?? 0) > 0 ? (
                    <div className="flex items-center rounded-md border border-[#d5c4b8] bg-white/95 px-1 py-0.5">
                      <button
                        type="button"
                        onClick={() => setCartItemQuantity(product, Math.max(0, (cartQtyBySlug[product.slug] ?? 0) - 1))}
                        className="h-6 w-6 rounded text-sm  text-[#5A272A] hover:bg-[#f4efec]"
                      >
                        -
                      </button>
                      <span className="min-w-5 text-center text-xs text-[#5A272A]">
                        {cartQtyBySlug[product.slug] ?? 0}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCartItemQuantity(product, (cartQtyBySlug[product.slug] ?? 0) + 1)}
                        className="h-6 w-6 rounded text-sm text-[#5A272A] hover:bg-[#f4efec]"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCartItemQuantity(product, 1)}
                      className="rounded-lg border border-white tracking-wide px-4 py-1.5 text-[12px] font-light text-white hover:bg-primary hover:text-white transition-all "
                    >
                      Add to Cart
                    </button>
                  )}
                  <button
                    onClick={() => handleBuyNow(product)}
                    className="rounded-lg bg-primary tracking-wide px-3 py-1.5 text-[12px] font-light text-white hover:bg-[#2d1011]"
                  >
                    Buy Now
                  </button>
                </div>
              </article>
            )))}
        </div>
      </div>
    </section>
  )
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <section className="flex min-h-[50vh] items-center justify-center bg-[#F3F0DC] text-[#5A272A]">
          Loading…
        </section>
      }
    >
      <ProductsPageContent />
    </Suspense>
  )
}
