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
import { Badge } from "@/components/ui/badge"
import { getCartItems, setCartItemQuantity, getCartQuantity } from "@/lib/cart"
import { getFavoriteSlugs, toggleFavoriteSlug } from "@/lib/favorites"
import { type StorefrontProduct } from "@/lib/storefront-products"
import { useStorefrontProducts } from "@/hooks/useStorefrontProducts"
import { X } from "lucide-react"
import { toast } from "@/lib/toast"

type CategoryFilter = "all" | string
type SortType = "popular" | "name-asc" | "name-desc" | "newest" | "price-low-high" | "price-high-low"
type CategoryApi = { id: string; name: string; slug: string }

function ProductsPageContent() {
  const searchParams = useSearchParams()
  const { products, loading, error } = useStorefrontProducts(60)
  const [categoryOptions, setCategoryOptions] = useState<Array<{ slug: string; name: string }>>([])
  const [tagOptions, setTagOptions] = useState<Array<{ slug: string; name: string }>>([])
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all")
  const [packFilter, setPackFilter] = useState<any>("all")
  const [mealTimeFilter, setMealTimeFilter] = useState<any>("all")
  const [availabilityFilter, setAvailabilityFilter] = useState<any>("all")
  const [bestSellerFilter, setBestSellerFilter] = useState<string>("all")
  const [featuredFilter, setFeaturedFilter] = useState<string>("all")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<SortType>("popular")
  const [favoriteSlugs, setFavoriteSlugs] = useState<string[]>([])
  const [cartQtyBySlug, setCartQtyBySlug] = useState<Record<string, number>>({})
  const searchTerm = (searchParams.get("search") || "").trim().toLowerCase()
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    fetch("/api/v1/categories")
      .then((r) => r.json())
      .then((categoryRes: { success?: boolean; message?: string; data?: any }) => {
        if (cancelled) return
        const categories = ((categoryRes.data as CategoryApi[] | undefined) ?? [])
          .filter((c) => c.slug && c.slug !== "all")
          .map((c) => ({ slug: c.slug, name: c.name }))
        setCategoryOptions(categories)
      })
      .catch(() => null)

    fetch("/api/v1/tags")
      .then((r) => r.json())
      .then((tagRes: { success?: boolean; data?: any }) => {
        if (cancelled) return
        const tags = ((tagRes.data as any[] | undefined) ?? [])
          .map((t) => ({ slug: t.slug, name: t.name }))
        setTagOptions(tags)
      })
      .catch(() => null)

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

  // Fetch DB Favorites on mount if logged in
  useEffect(() => {
    const fetchDbFavorites = async () => {
      const token = window.localStorage.getItem("ziply5_access_token");
      const userStr = window.localStorage.getItem("ziply5_user");
      const userId = userStr ? JSON.parse(userStr).id : null;
      
      if (token && userId) {
        try {
          const res = await fetch("/api/v1/favorites", {
            headers: { 
              Authorization: `Bearer ${token}`,
              "x-user-id": userId 
            },
          });
          const payload = await res.json();
          if (payload.success && Array.isArray(payload.data)) {
            window.localStorage.setItem("ziply5-favorites", JSON.stringify(payload.data));
            setFavoriteSlugs(payload.data);
          }
        } catch (e) { /* silent fail */ }
      }
    };
    fetchDbFavorites();
  }, []);

  const handleToggleFavorite = async (e: React.MouseEvent, slug: string) => {
    e.stopPropagation();
    const token = window.localStorage.getItem("ziply5_access_token");
    if (!token) {
      if (confirm("Log in to sync favorites across devices? Cancel to save locally.")) {
        router.push("/login");
        return;
      }
    }
    const isAdded = await toggleFavoriteSlug(slug);
    if (isAdded) {
      toast.success("Added to favorites", "Product added to your wishlist.");
    } else {
      toast.info("Removed from favorites", "Product removed from your wishlist.");
    }
    setFavoriteSlugs(getFavoriteSlugs());
  }

  const categories = useMemo(() => {
    const base = categoryOptions.length > 0 
      ? categoryOptions 
      : Array.from(new Set(products.map((p) => p.category).filter((x) => x && x !== "all"))).map((slug) => ({
          slug,
          name: slug.replace(/-/g, " "),
        }));
    
    // Merge Meal Types into Category Options as they are conceptually same for filtering here
    return [...base]
  }, [categoryOptions, products])

  const filteredProducts = useMemo(() => {
    let items = products.filter((item) => {
      // Merged logic: filter matches either the category field OR the diet type field
      const categoryMatch = categoryFilter === "all" || item.category === categoryFilter || item.type === categoryFilter
      
      const packMatch =
        packFilter === "all" ||
        (packFilter === "combo-pack" && (item as any).isCombo) ||
        (packFilter === "limited-offers" && (item as any).isLimited)
      const mealTimeMatch = mealTimeFilter === "all" || (item as any).mealTime === mealTimeFilter
      const availabilityMatch =
        availabilityFilter === "all" ||
        (availabilityFilter === "in-stock" && (item as any).inStock !== false) ||
        (availabilityFilter === "out-of-stock" && (item as any).inStock === false)

      const bestSellerMatch =
        bestSellerFilter === "all" || (item as any).isBestSeller === true
      const featuredMatch =
        featuredFilter === "all" || (item as any).isFeatured === true

      const tagMatch = selectedTags.length === 0 || 
        selectedTags.some(tag => (item as any).tags?.some((t: any) => (t.tag?.slug || t.slug || t) === tag))

      return categoryMatch && packMatch && mealTimeMatch && availabilityMatch && 
             bestSellerMatch && featuredMatch && tagMatch
    })

    if (searchTerm) {
      items = items.filter((item) => item.name.toLowerCase().includes(searchTerm))
    }

    // Applied enhanced sorting
    if (sortBy === "name-asc") {
      items.sort((a, b) => a.name.localeCompare(b.name))
    } else if (sortBy === "name-desc") {
      items.sort((a, b) => b.name.localeCompare(a.name))
    } else if (sortBy === "price-low-high") {
      items.sort((a, b) => Number(a.price) - Number(b.price))
    } else if (sortBy === "price-high-low") {
      items.sort((a, b) => Number(b.price) - Number(a.price))
    } else if (sortBy === "newest") {
      items.sort((a, b) => new Date((b as any).updatedAt || 0).getTime() - new Date((a as any).updatedAt || 0).getTime())
    } else if (sortBy === "popular") {
      items.sort((a, b) => ((b as any).reviews?.length || 0) - ((a as any).reviews?.length || 0))
    }

    return items
  }, [products, categoryFilter, packFilter, mealTimeFilter, availabilityFilter, bestSellerFilter, featuredFilter, selectedTags, sortBy, searchTerm])

  const toggleTag = (slug: string) => {
    setSelectedTags(prev => prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug])
  }

  const [selectedProduct, setSelectedProduct] = useState<any | null>(null)

  const updateVariantQty = (product: any, variant: any, nextQty: number) => {
    const vId = variant.id ? String(variant.id) : (variant.sku || variant.weight || variant.name);
    setCartItemQuantity({
      productId: String(product.id),
      variantId: vId,
      slug: product.slug,
      name: product.name,
      price: variant.price,
      image: product.image,
      weight: variant.weight || variant.name,
      sku: variant.sku
    }, nextQty)
  }

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

          <div className="p-3 md:p-4 bg-white/40 rounded-3xl">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wide text-[#1F1F1C]">Filtered Products By</p>
                <button
                  onClick={() => {
                    setCategoryFilter("all")
                    setPackFilter("all")
                    setMealTimeFilter("all")
                    setAvailabilityFilter("all")
                    setBestSellerFilter("all")
                    setFeaturedFilter("all")
                    setSelectedTags([])
                    setSortBy("popular")
                  }}
                  className="text-[10px] font-bold uppercase tracking-widest text-[#7A2B19] hover:underline"
                >
                  Reset Filters
                </button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 items-center">
                <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as CategoryFilter)}>
                  <SelectTrigger className="rounded-full border-[#D9D9D1] bg-white px-4 text-xs font-medium h-9">
                    <SelectValue placeholder="Category & Type" />
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

                <Select value={packFilter} onValueChange={(value) => setPackFilter(value as any)}>
                  <SelectTrigger className="rounded-full border-[#D9D9D1] bg-white px-4 text-xs font-medium h-9">
                    <SelectValue placeholder="Packs & Deals" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Packs</SelectItem>
                    <SelectItem value="combo-pack">Combo Pack</SelectItem>
                    <SelectItem value="limited-offers">Limited Deals</SelectItem>
                  </SelectContent>
                </Select>

                {/* <Select value={mealTimeFilter} onValueChange={(value) => setMealTimeFilter(value as any)}>
                  <SelectTrigger className="rounded-full border-[#D9D9D1] bg-white px-4 text-xs font-medium h-9">
                    <SelectValue placeholder="Meal Time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Meal Times</SelectItem>
                    <SelectItem value="breakfast">Breakfast</SelectItem>
                    <SelectItem value="lunch">Lunch</SelectItem>
                    <SelectItem value="dinner">Dinner</SelectItem>
                  </SelectContent>
                </Select> */}

                <Select value={availabilityFilter} onValueChange={(value) => setAvailabilityFilter(value as any)}>
                  <SelectTrigger className="rounded-full border-[#D9D9D1] bg-white px-4 text-xs font-medium h-9">
                    <SelectValue placeholder="Availability" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Availability</SelectItem>
                    <SelectItem value="in-stock">In Stock</SelectItem>
                    <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortType)}>
                  <SelectTrigger className="rounded-full border-[#D9D9D1] bg-white px-4 text-xs font-medium h-9">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popular">Popular</SelectItem>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="price-low-high">Price: Low to High</SelectItem>
                    <SelectItem value="price-high-low">Price: High to Low</SelectItem>
                    <SelectItem value="name-asc">A to Z</SelectItem>
                    <SelectItem value="name-desc">Z to A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Tag Selector */}
              <div className="pt-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Filter by Tags & Highlights</p>
                <div className="flex flex-wrap gap-2">
                  {tagOptions.map((tag) => (
                    <button
                      key={tag.slug}
                      onClick={() => toggleTag(tag.slug)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all border ${
                        selectedTags.includes(tag.slug) 
                          ? "bg-primary text-white border-primary shadow-sm" 
                          : "bg-white text-gray-500 border-gray-200 hover:border-primary"
                      }`}
                    >
                      {tag.name}
                    </button>
                  ))}
                  <button
                    onClick={() => setBestSellerFilter(bestSellerFilter === "all" ? "true" : "all")}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all border ${
                      bestSellerFilter === "true"
                        ? "bg-primary text-white border-primary shadow-sm"
                        : "bg-white text-gray-500 border-gray-200 hover:border-primary"
                    }`}
                  >
                    Best Sellers
                  </button>
                  <button
                    onClick={() => setFeaturedFilter(featuredFilter === "all" ? "true" : "all")}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all border ${
                      featuredFilter === "true"
                        ? "bg-primary text-white border-primary shadow-sm"
                        : "bg-white text-gray-500 border-gray-200 hover:border-primary"
                    }`}
                  >
                    Featured
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

        {loading && (
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="h-56 animate-pulse rounded-2xl bg-white/70" />
            ))}
          </div>
        )}
        {!loading && filteredProducts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 bg-white/30 rounded-3xl border-2 border-dashed border-gray-200">
            <div className="text-6xl mb-4">🍽️</div>
            <h3 className="font-melon text-xl text-[#5A272A] font-bold uppercase">No Products Found</h3>
            <p className="text-sm text-gray-500 mt-2">Try adjusting your filters or search term to find what you're looking for.</p>
            <button 
              onClick={() => { setCategoryFilter("all"); setPackFilter("all"); setMealTimeFilter("all"); setSelectedTags([]); }}
              className="mt-6 rounded-full bg-primary px-6 py-2 text-xs font-bold text-white uppercase tracking-widest"
            >
              Clear All Filters
            </button>
          </div>
        )}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product, idx) => {
            const displayPrice = (product as any).variants?.length
              ? Number(
                  (product as any).variants.find((v: any) => v.isDefault)?.price ||
                    (product as any).variants[0].price
                )
              : Number(product.price || 0);

            return (
              <article
                key={`${product.id || product.slug || "product"}-${idx}`}
                className="group relative rounded-2xl border-2 border-transparent p-4 transition-all duration-300 hover:ring-4 hover:ring-[#F36E21] hover:shadow-xl]"
                style={{ backgroundColor: "#3EA6CF" }}
              >
              <button
                type="button"
                onClick={(e) => handleToggleFavorite(e, product.slug)}
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
                    Home style meal | Net wt. {product.weight}
                  </p>
                  {product.productKind === "simple" && product.stock && product?.stock > 0 && (
                    <p className="mt-1 text-[11px] font-bold text-orange-200">
                      {product?.stock < 5 ? `Hurry up only ${product.stock} left` : `${product.stock} in stock`}
                    </p>
                  )}
                   <p className="mt-1 text-sm font-melon text-[#FFF5C5]">Rs. {product.price.toFixed(2)}</p>
                </div>
              </Link>

                <div className="mt-3 flex items-center justify-between gap-2 font-melon tracking-wide font-light">
                  {(cartQtyBySlug[product.slug] ?? 0) > 0 && product.productKind === "simple" ? (
                    <div className="flex items-center rounded-md border border-[#d5c4b8] bg-white/95 px-1 py-0.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCartItemQuantity(product, Math.max(0, (cartQtyBySlug[product.slug] ?? 0) - 1));
                        }}
                        className="h-6 w-6 rounded text-sm  text-[#5A272A] hover:bg-[#f4efec]"
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
                        className="h-6 w-6 rounded text-sm text-[#5A272A] hover:bg-[#f4efec]"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (product.productKind === "variant") {
                          setSelectedProduct(product);
                        } else {
                          setCartItemQuantity(product, 1);
                        }
                      }}
                      className="rounded-lg border border-white tracking-wide px-4 py-1.5 text-[12px] font-light text-white hover:bg-primary hover:text-white transition-all "
                    >
                      Add to Cart
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (product.productKind === "variant") {
                        setSelectedProduct(product);
                      } else {
                        if ((cartQtyBySlug[product.slug] ?? 0) === 0) {
                          setCartItemQuantity(product, 1);
                        }
                        router.push("/checkout");
                      }
                    }} className="rounded-lg bg-primary tracking-wide px-3 py-1.5 text-[12px] font-light text-white hover:bg-[#2d1011]">
                    Buy Now
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* VARIANT SELECTION MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setSelectedProduct(null)}>
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between bg-primary p-5 text-white">
              <h3 className="font-melon text-lg font-bold uppercase tracking-wider">Select Options</h3>
              <button onClick={() => setSelectedProduct(null)} className="rounded-full bg-white/20 p-1 hover:bg-white/30 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-4 flex gap-4">
                <div className="relative h-20 w-20 shrink-0 rounded-xl bg-gray-100 p-2">
                  <Image src={selectedProduct.image} alt={selectedProduct.name} fill className="object-contain" />
                </div>
                <div>
                  <h4 className="font-melon text-base font-bold text-[#4A1D1F]">{selectedProduct.name}</h4>
                  <p className="text-xs text-gray-500 line-clamp-2">{selectedProduct.description}</p>
                </div>
              </div>

              <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                {selectedProduct.variants.map((v: any) => {
                  const vId = v.id ? String(v.id) : (v.sku || v.weight || v.name);
                  const qty = getCartQuantity(String(selectedProduct.id), vId)
                  return (
                    <div key={v.id} className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50/50 p-4 transition-all hover:border-orange-200">
                      <div>
                        <p className="font-melon text-sm font-bold text-[#4A1D1F]">{v.weight || v.name}</p>
                        <p className="text-sm font-bold text-orange-500">Rs. {v.price.toFixed(2)}</p>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {qty > 0 ? (
                          <div className="flex items-center rounded-lg border border-orange-200 bg-white px-2 py-1 shadow-sm">
                            <button onClick={(e) => { e.stopPropagation(); updateVariantQty(selectedProduct, v, qty - 1); }} className="h-6 w-6 font-bold text-primary hover:scale-110 transition-transform">-</button>
                            <span className="min-w-6 text-center text-xs font-bold text-gray-700">{qty}</span>
                            <button onClick={(e) => { e.stopPropagation(); updateVariantQty(selectedProduct, v, qty + 1); }} className="h-6 w-6 font-bold text-primary hover:scale-110 transition-transform">+</button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); updateVariantQty(selectedProduct, v, 1); }}
                            className="rounded-full bg-primary px-5 py-1.5 text-[11px] font-bold text-white shadow-md hover:bg-[#3a1517] transition-all"
                          >
                            ADD
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
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
