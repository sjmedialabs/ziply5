"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
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
import { getCartItems, setCartItemQuantity } from "@/lib/cart"
import { getFavoriteSlugs, toggleFavoriteSlug } from "@/lib/favorites"
import { toStorefrontProduct, type StorefrontProduct } from "@/lib/storefront-products"

type CategoryFilter = "all" | string
type MealTypeFilter = "all" | "veg" | "non-veg"
type SortType = "popular" | "name-asc" | "name-desc"
type CategoryApi = { id: string; name: string; slug: string }
type ProductApi = {
  id: string
  categories?: Array<{ category?: { slug?: string } }>
}

function ProductsPageContent() {
  const searchParams = useSearchParams()
  const [products, setProducts] = useState<StorefrontProduct[]>([])
  const [categoryOptions, setCategoryOptions] = useState<Array<{ slug: string; name: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all")
  const [mealTypeFilter, setMealTypeFilter] = useState<MealTypeFilter>("all")
  const [sortBy, setSortBy] = useState<SortType>("popular")
  const [favoriteSlugs, setFavoriteSlugs] = useState<string[]>([])
  const [cartQtyBySlug, setCartQtyBySlug] = useState<Record<string, number>>({})
  const searchTerm = (searchParams.get("search") || "").trim().toLowerCase()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError("")
    Promise.all([
      fetch("/api/v1/products?page=1&limit=200").then((r) => r.json()),
      fetch("/api/v1/categories").then((r) => r.json()),
    ])
      .then(([productRes, categoryRes]: Array<{ success?: boolean; message?: string; data?: unknown }>) => {
        if (cancelled) return
        if (productRes.success === false) {
          setError(productRes.message ?? "Could not load products")
          return
        }

        const categories = ((categoryRes.data as CategoryApi[] | undefined) ?? [])
          .filter((c) => c.slug && c.slug !== "all")
          .map((c) => ({ slug: c.slug, name: c.name }))
        setCategoryOptions(categories)

        const rows = ((productRes.data as { items?: ProductApi[] } | undefined)?.items ?? [])
        const normalized = rows.map((item) => {
          const mapped = toStorefrontProduct(item as never)
          if (mapped.category !== "all") return mapped
          const linkedSlug = item.categories?.[0]?.category?.slug
          if (linkedSlug) return { ...mapped, category: linkedSlug }
          if (categories.length === 1) return { ...mapped, category: categories[0].slug }
          return mapped
        })
        setProducts(normalized)
      })
      .catch(() => {
        if (!cancelled) setError("Could not load products")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

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

  const categories = useMemo(() => {
    if (categoryOptions.length > 0) return categoryOptions
    return Array.from(new Set(products.map((p) => p.category).filter((x) => x && x !== "all"))).map((slug) => ({
      slug,
      name: slug.replace(/-/g, " "),
    }))
  }, [categoryOptions, products])

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
  }, [products, categoryFilter, mealTypeFilter, sortBy, searchTerm])

  return (
    <section className="w-full bg-[#F3F0DC] py-8 md:py-10">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
        <div className="mb-6 flex flex-col gap-4">
          {searchTerm && (
            <p className="text-sm font-medium text-[#5A272A]">
              Search results for "<span className="font-bold">{searchTerm}</span>" ({filteredProducts.length})
            </p>
          )}

          <div className="p-3 md:p-4">
            <div className="flex flex-col gap-3">
              <p className="text-xs font-bold uppercase tracking-wide text-[#1F1F1C]">Filtered Products By</p>
              <div className="flex flex-row gap-4 items-center">
                <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as CategoryFilter)}>
                  <SelectTrigger className="h-10 w-full min-w-[190px] rounded-full border-[#D9D9D1] bg-white px-4 text-sm font-medium text-[#494944]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat, idx) => (
                      <SelectItem key={`${cat.slug || "cat"}-${idx}`} value={cat.slug}>
                        {cat.name}
                      </SelectItem>
                    ))}
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
                            <div className="mt-3 flex flex-wrap gap-2 text-xs">
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
            {/* <div className="hidden items-center gap-2 text-xs md:flex">
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
            </div> */}
          </div>
        </div>

        {loading && <p className="mb-4 text-sm text-[#646464]">Loading products...</p>}
        {!loading && filteredProducts.length === 0 && (
          <p className="mb-4 rounded-lg bg-white px-4 py-3 text-sm text-[#646464]">No published products found.</p>
        )}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product, idx) => (
            <article
              key={`${product.id || product.slug || "product"}-${idx}`}
              className="group relative rounded-2xl border-2 border-transparent p-4 transition-all duration-300 hover:ring-4 hover:ring-[#F36E21] hover:shadow-xl]"
              style={{ backgroundColor: "#3EA6CF" }}
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

                <div className="relative mx-auto h-[280px] w-full max-w-[190px] transition-transform duration-300 hover:scale-90">
                  <Image src={product.image} alt={product.name} fill className="object-contain" />
                </div>

                <div className="mt-2 text-center tracking-wide font-light font-melon">
                  <h3 className="text-[18px] uppercase leading-tight text-white drop-shadow-[0_1px_0_rgba(0,0,0,0.2)]">
                    {product.name}
                  </h3>
                  <p className="mt-1 text-[10px] uppercase tracking-wide text-white/90">
                    Home style meal | Net wt. {product.weight}
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
                    <Link href="/checkout" className="rounded-lg bg-primary tracking-wide px-3 py-1.5 text-[12px] font-light text-white hover:bg-[#2d1011]">
                      Buy Now
                    </Link>
                  </div>
            </article>
          ))}
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
