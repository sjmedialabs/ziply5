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
import { FadeIn, SlideUp, ScaleHover, ModalAnimation } from "@/components/animations"

type CategoryFilter = "all" | string
type SortType = "popular" | "name-asc" | "name-desc" | "newest" | "price-low-high" | "price-high-low"
type CategoryApi = { id: string; name: string; slug: string }
type PreparationFilter = "all" | "ready_to_eat" | "ready_to_cook"
type SpiceFilter = "all" | "mild" | "medium" | "hot" | "extra_hot"

function mulberry32(seed: number) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let x = Math.imul(t ^ (t >>> 15), 1 | t)
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

function inForbiddenHue(h: number) {
  // avoid brown/yellow/gold range (roughly orange→yellow)
  const hue = ((h % 360) + 360) % 360
  return hue >= 15 && hue <= 75
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function ProductsPageContent() {
  const searchParams = useSearchParams()
  const { products, loading, error } = useStorefrontProducts(60)
  const [categoryOptions, setCategoryOptions] = useState<Array<{ slug: string; name: string }>>([])
  const [tagOptions, setTagOptions] = useState<Array<{ slug: string; name: string, id: string }>>([])
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all")
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [packFilter, setPackFilter] = useState<any>("all")
  const [mealTimeFilter, setMealTimeFilter] = useState<any>("all")
  const [availabilityFilter, setAvailabilityFilter] = useState<any>("all")
  const [bestSellerFilter, setBestSellerFilter] = useState<string>("all")
  const [featuredFilter, setFeaturedFilter] = useState<string>("all")
  const [preparationTypeFilter, setPreparationTypeFilter] = useState<PreparationFilter>("all")
  const [spiceLevelFilter, setSpiceLevelFilter] = useState<SpiceFilter>("all")
  const [sortBy, setSortBy] = useState<SortType>("popular")
  const [favoriteSlugs, setFavoriteSlugs] = useState<string[]>([])
  const [cartQtyBySlug, setCartQtyBySlug] = useState<Record<string, number>>({})
  const searchTerm = (searchParams.get("search") || "").trim().toLowerCase()
  const router = useRouter()
  const pageSeedRef = useState(() => {
    // Random per page load, stable for this mounted session
    if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
      const arr = new Uint32Array(1)
      crypto.getRandomValues(arr)
      return Number(arr[0] ?? Date.now())
    }
    return Date.now()
  })[0]
  const packParam = (searchParams.get("pack") || "").trim().toLowerCase()
  const typeParam = (searchParams.get("type") || "").trim().toLowerCase()
  const comboParam = (searchParams.get("combo") || "").trim().toLowerCase()
  const productTypeParam = (searchParams.get("productType") || "").trim().toLowerCase()
  const categoryParam = (searchParams.get("category") || "").trim().toLowerCase()
  const tagParam = (searchParams.get("tag") || "").trim().toLowerCase()
  const preparationTypeParam = (searchParams.get("preparationType") || "").trim().toLowerCase()
  const spiceLevelParam = (searchParams.get("spiceLevel") || "").trim().toLowerCase()
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
          .map((t) => ({ slug: t.slug, name: t.name, id: t.id,   }))
        setTagOptions(tags)
      })
      .catch(() => null)

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const wantsCombo =
      packParam === "combo-pack" ||
      typeParam === "combo" ||
      comboParam === "true" ||
      productTypeParam === "combo"
    if (wantsCombo) setPackFilter("combo-pack")
    else if (packParam === "limited-offers") setPackFilter("limited-offers")
    // else do not override user selection
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packParam, typeParam, comboParam, productTypeParam])

  useEffect(() => {
    const normalizeMappedTag = (value: string) => {
      if (value === "nonveg") return "non-veg"
      return value
    }

    const queryFilterConfig = [
      {
        key: "category",
        value: categoryParam,
        apply: (value: string) => setCategoryFilter(value || "all"),
      },
      {
        key: "preparationType",
        value: preparationTypeParam,
        apply: (value: string) => {
          if (value === "ready-to-eat") return setPreparationTypeFilter("ready_to_eat")
          if (value === "ready-to-cook") return setPreparationTypeFilter("ready_to_cook")
          if (value === "ready_to_eat" || value === "ready_to_cook") return setPreparationTypeFilter(value as PreparationFilter)
          setPreparationTypeFilter("all")
        },
      },
      {
        key: "spiceLevel",
        value: spiceLevelParam,
        apply: (value: string) => {
          const normalized = value.replace(/-/g, "_")
          if (["mild", "medium", "hot", "extra_hot"].includes(normalized)) {
            setSpiceLevelFilter(normalized as SpiceFilter)
            return
          }
          setSpiceLevelFilter("all")
        },
      },
      {
        key: "tag",
        value: tagParam,
        apply: (value: string) => {
          if (!value) {
            setSelectedTagIds([])
            return
          }
          const wanted = normalizeMappedTag(value)
          const match = tagOptions.find((t) => t.slug === wanted || t.name.toLowerCase() === wanted)
          setSelectedTagIds(match ? [match.id] : [])
        },
      },
    ] as const

    queryFilterConfig.forEach((filter) => filter.apply(filter.value))
  }, [categoryParam, preparationTypeParam, spiceLevelParam, tagParam, tagOptions])
  console.log("ProductsPageContent", { products, selectedTagIds})
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
  console.log("ProductsPageContent render", { categoryFilter, packFilter, mealTimeFilter, availabilityFilter, bestSellerFilter, featuredFilter, selectedTagIds, sortBy, searchTerm })
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
      const preparationTypeMatch =
        preparationTypeFilter === "all" || String((item as any).preparationType ?? "") === preparationTypeFilter
      const spiceLevelMatch =
        spiceLevelFilter === "all" || String((item as any).spiceLevel ?? "") === spiceLevelFilter

const tagMatch =
  selectedTagIds.length === 0 ||
  selectedTagIds.some((selectedId) =>
    (item as any).tags?.some((t: any) => t.tag.id === selectedId)
  );
      return categoryMatch && packMatch && mealTimeMatch && availabilityMatch && 
             bestSellerMatch && featuredMatch && preparationTypeMatch && spiceLevelMatch && tagMatch
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
  }, [products, categoryFilter, packFilter, mealTimeFilter, availabilityFilter, bestSellerFilter, featuredFilter, preparationTypeFilter, spiceLevelFilter, selectedTagIds, sortBy, searchTerm])

  const productBgBySlug = useMemo(() => {
    const rng = mulberry32(pageSeedRef)
    const GOLDEN_ANGLE = 137.50776405003785

    // mid-tone constraints: not too bright/dark
    const satBase = 38 + rng() * 12 // 38–50
    const lightBase = 52 + rng() * 10 // 52–62

    // random start hue, but not in forbidden range
    let startHue = rng() * 360
    for (let tries = 0; tries < 20 && inForbiddenHue(startHue); tries++) {
      startHue = (startHue + 23 + rng() * 37) % 360
    }

    const map: Record<string, string> = {}
    for (let i = 0; i < filteredProducts.length; i++) {
      const p = filteredProducts[i] as any
      const key = String(p.slug || p.id || i)

      let hue = (startHue + i * GOLDEN_ANGLE) % 360
      // if hue lands in forbidden band, walk forward until it doesn't
      for (let tries = 0; tries < 24 && inForbiddenHue(hue); tries++) hue = (hue + 9) % 360

      const s = clamp(satBase + (rng() - 0.5) * 8, 34, 52)
      const l = clamp(lightBase + (rng() - 0.5) * 8, 48, 66)
      map[key] = `hsl(${hue.toFixed(0)} ${s.toFixed(0)}% ${l.toFixed(0)}%)`
    }
    return map
  }, [filteredProducts, pageSeedRef])

const toggleTag = (tagId: string) => {
  setSelectedTagIds(prev =>
    prev.includes(tagId)
      ? prev.filter(id => id !== tagId)
      : [...prev, tagId]
  )
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
    <FadeIn>
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
                    setPreparationTypeFilter("all")
                    setSpiceLevelFilter("all")
                    setSelectedTagIds([])
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
                <Select value={preparationTypeFilter} onValueChange={(value) => setPreparationTypeFilter(value as PreparationFilter)}>
                  <SelectTrigger className="rounded-full border-[#D9D9D1] bg-white px-4 text-xs font-medium h-9">
                    <SelectValue placeholder="Preparation Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Preparation Types</SelectItem>
                    <SelectItem value="ready_to_eat">Ready to Eat</SelectItem>
                    <SelectItem value="ready_to_cook">Ready to Cook</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={spiceLevelFilter} onValueChange={(value) => setSpiceLevelFilter(value as SpiceFilter)}>
                  <SelectTrigger className="rounded-full border-[#D9D9D1] bg-white px-4 text-xs font-medium h-9">
                    <SelectValue placeholder="Spice Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Spice Levels</SelectItem>
                    <SelectItem value="mild">Mild</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hot">Hot</SelectItem>
                    <SelectItem value="extra_hot">Extra Hot</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Tag Selector */}
              <div className="pt-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Filter by Tags & Highlights</p>
                <div className="flex flex-wrap gap-2">
                  {tagOptions.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all border ${
                        selectedTagIds.includes(tag.id) 
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
              onClick={() => { setCategoryFilter("all"); setPackFilter("all"); setMealTimeFilter("all"); setPreparationTypeFilter("all"); setSpiceLevelFilter("all"); setSelectedTagIds([]); }}
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
            const cardBg = productBgBySlug[String(product.slug || product.id || idx)] || "#3EA6CF"
            const comboProducts = ((product as any).bundleProducts ?? []) as Array<{ thumbnail?: string | null; name?: string }>
            const comboThumbs = comboProducts
              .map((x) => (x?.thumbnail ?? "").trim())
              .filter(Boolean)
              .slice(0, 3)
            const showComboThumbStrip =
              Boolean((product as any).isCombo) &&
              (product.image === "/placeholder.jpg" || !String(product.image ?? "").trim()) &&
              comboThumbs.length > 0

            return (
              <SlideUp key={`${product.id || product.slug || "product"}-${idx}`} delay={Math.min(0.18, idx * 0.03)}>
                <ScaleHover>
                  <article
                    className="group relative rounded-2xl border-2 border-transparent p-4 transition-all duration-300 hover:ring-4 hover:ring-[#F36E21] hover:shadow-xl will-change-transform"
                    style={{ backgroundColor: cardBg }}
                  >
              <button
                type="button"
                onClick={(e) => handleToggleFavorite(e, product.slug)}
                className="absolute left-3 top-3 z-20 text-lg text-white"
              >
                {favoriteSlugs.includes(product.slug) ? "♥" : "♡"}
              </button>

                <Link href={(product as any).isCombo ? `/combo/${product.slug}` : `/product/${product.slug}`} className="block">
                  {product.tags &&
                  product?.tags[0]?.tag?.name && (
                           <div className="absolute top-3  z-20 right-0 w-20 h-5 rounded-sm flex items-center justify-center">
                                    {
                                        product.tags[0].tag.name === "veg"?(<span className="absolute top-4 right-0 bg-[#10B981] text-white text-[11px] font-medium px-3 py-1 border border-white rounded-l-sm z-10">
                                      {product.tags[0].tag.name?.charAt(0).toUpperCase() + product.tags[0].tag.name.slice(1)}
                                    </span>):(<span className="absolute top-4 right-0 bg-[#F97316] text-white text-[11px] font-medium px-3 py-1 rounded-l-sm border border-white z-10">
                                      {product.tags[0].tag.name?.charAt(0).toUpperCase() + product.tags[0].tag.name.slice(1)}
                                    </span>)
                                      }
                            </div>
                  )
                }

                  <div className="relative mx-auto h-[280px] w-full max-w-[190px] transition-transform duration-300 hover:scale-90">
                    {showComboThumbStrip ? (
                      <div className="flex h-full w-full items-center justify-center gap-2 px-1">
                        {comboThumbs.map((thumb, imageIdx) => (
                          <div key={`${product.slug}-combo-thumb-${imageIdx}`} className="flex items-center gap-2">
                            <div className="relative h-30 w-28">
                              <Image
                                src={thumb}
                                alt={`${product.name} item ${imageIdx + 1}`}
                                fill
                                className=""
                              />
                            </div>
                            {imageIdx < comboThumbs.length - 1 ? (
                              <span className="text-xl font-bold text-white/95 ">+</span>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Image src={product.image} alt={product.name} fill className="object-contain" />
                    )}
                  </div>

                <div className="mt-2 text-center tracking-wide font-light font-melon">
                  <h3 className="text-[18px] uppercase leading-tight text-white drop-shadow-[0_1px_0_rgba(0,0,0,0.2)]">
                    {product.name}
                  </h3>
                  <p className="mt-1 text-[10px] uppercase tracking-wide text-white/90">
                    Home style meal | Net wt. {product.weight}
                  </p>
                  {product.productKind === "simple" && product.stock && product.stock > 0 && product.stock <= 5 && (
                    <p className="mt-1 text-[11px] font-medium text-orange-200">
                      Hurry up only {product.stock} left
                    </p>
                  )}
                   <p className="mt-1 text-sm font-melon text-[#FFF5C5]">Rs. {product.price.toFixed(2)}</p>
                </div>
              </Link>

                <div className="mt-auto flex items-end justify-between gap-2 pt-2 font-melon tracking-wide font-light">
                  {(cartQtyBySlug[product.slug] ?? 0) > 0 && product.productKind === "simple" ? (
                    <div className="flex items-center rounded-md border border-[#d5c4b8] bg-white/95 px-1 py-0.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCartItemQuantity(product as any, Math.max(0, (cartQtyBySlug[product.slug] ?? 0) - 1));
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
                          setCartItemQuantity(product as any, (cartQtyBySlug[product.slug] ?? 0) + 1);
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
                        if ((product as any).isCombo) {
                          window.location.href = `/combo/${product.slug}`
                        } else if (product.productKind === "variant") {
                          setSelectedProduct(product);
                        } else {
                          setCartItemQuantity(product as any, 1);
                        }
                      }}
                      className="rounded-lg border border-white tracking-wide px-4 py-1.5 text-[12px] font-light text-white hover:bg-primary hover:text-white transition-all "
                    >
                      {(product as any).isCombo ? "View Combo" : "Add to Cart"}
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (product.productKind === "variant") {
                        setSelectedProduct(product);
                      } else {
                        if ((cartQtyBySlug[product.slug] ?? 0) === 0) {
                          setCartItemQuantity(product as any, 1);
                        }
                        router.push("/checkout");
                      }
                    }} className="rounded-lg bg-primary tracking-wide px-3 py-1.5 text-[12px] font-light text-white hover:bg-[#2d1011]">
                    Buy Now
                  </button>
                </div>
                  </article>
                </ScaleHover>
              </SlideUp>
            );
          })}
        </div>
      </div>

      {/* VARIANT SELECTION MODAL */}
      <ModalAnimation open={Boolean(selectedProduct)} className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" >
        {selectedProduct ? (
          <div onClick={() => setSelectedProduct(null)} className="fixed inset-0 flex items-center justify-center p-4">
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
                  <h4 className="font-melon text-base font-medium text-[#4A1D1F]">{selectedProduct.name}</h4>
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
                        <p className="font-melon text-sm font-medium text-[#4A1D1F]">{v.weight || v.name}</p>
                        <p className="text-sm font-medium text-orange-500">Rs. {v.price.toFixed(2)}</p>
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

            <div className="border-t border-gray-100 p-5 flex items-center justify-between gap-3 bg-gray-50/50">
              <button
                onClick={() => setSelectedProduct(null)}
                className="flex-1 rounded-full border-2 cursor-pointer border-primary py-2.5 text-[11px] font-bold uppercase tracking-widest text-primary hover:bg-primary/10 transition-colors"
              >
                Continue Shopping
              </button>
              <button
                onClick={() => {
                  setSelectedProduct(null);
                  router.push("/cart");
                }}
                className="flex-1 rounded-full bg-primary cursor-pointer border-2 border-primary py-2.5 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-[#3a1517] transition-colors"
              >
                Go to Cart
              </button>
            </div>
          </div>
        </div>
        ) : null}
      </ModalAnimation>
    </section>
    </FadeIn>
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
