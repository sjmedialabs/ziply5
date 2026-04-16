"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react"
import { getFavoriteSlugs, toggleFavoriteSlug } from "@/lib/favorites"
import { addToCart, getCartItems, getCartQuantityForSlug, setCartItemQuantity } from "@/lib/cart"
import { toStorefrontProduct, type StorefrontProduct } from "@/lib/storefront-products"
import Link from "next/link"

export default function ProductPage() {
  const params = useParams()
  const router = useRouter()
  const slugParam = params?.slug
  const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam
  const [product, setProduct] = useState<StorefrontProduct | null>(null)
  const [relatedProducts, setRelatedProducts] = useState<StorefrontProduct[]>([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
    const [cartQtyBySlug, setCartQtyBySlug] = useState<Record<string, number>>({})
  const [quantity, setQuantity] = useState(1)
  const [selectedSize, setSelectedSize] = useState("")
  const [openSection, setOpenSection] = useState<string | null>(null)
  const [favorite, setFavorite] = useState(false)
  const [relatedStart, setRelatedStart] = useState(0)
  const [selectedImage, setSelectedImage] = useState("")
  const [thumbStart, setThumbStart] = useState(0)

  const galleryImages = useMemo(() => {
    if (!product) return []
    const cleaned = (product.gallery ?? []).map((img) => img.trim()).filter(Boolean)
    const fallback = product.image.trim()
    return cleaned.length ? cleaned : fallback ? [fallback] : []
  }, [product])

  const displayImage = useMemo(() => {
    const current = selectedImage.trim()
    if (current) return current
    return galleryImages[0] ?? null
  }, [galleryImages, selectedImage])

  const visibleThumbs = useMemo(() => {
    if (galleryImages.length <= 4) return galleryImages
    return Array.from({ length: 4 }).map((_, idx) => galleryImages[(thumbStart + idx) % galleryImages.length])
  }, [galleryImages, thumbStart])

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    setLoading(true)
    setError("")
    Promise.all([
      fetch(`/api/v1/products/by-slug/${encodeURIComponent(slug)}`).then((r) => r.json()),
      fetch("/api/v1/products?page=1&limit=20").then((r) => r.json()),
    ])
      .then(([single, list]: Array<{ success?: boolean; data?: unknown; message?: string }>) => {
        if (cancelled) return
        if (single.success === false || !single.data) {
          setError(single.message ?? "Product not found")
          return
        }
        const item = toStorefrontProduct(single.data as never)
        setProduct(item)
        const rel =
          list.success === false
            ? []
            : ((list.data as { items?: unknown[] } | undefined)?.items ?? [])
                .map((x) => toStorefrontProduct(x as never))
                .filter((x) => x.id !== item.id)
        setRelatedProducts(rel)
      })
      .catch(() => {
        if (!cancelled) setError("Could not load product")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  const visibleRelated = useMemo(() => {
    if (relatedProducts.length === 0) return []
    return Array.from({ length: 4 }).map((_, index) => {
      const item = relatedProducts[(relatedStart + index) % relatedProducts.length]
      return item
    })
  }, [relatedProducts, relatedStart])

  const activeVariant = useMemo(() => {
    if (!product) return null
    return product.variants.find((v) => v.name === selectedSize) ?? product.variants[0] ?? null
  }, [product, selectedSize])

  const currentPrice = activeVariant?.price ?? product?.price ?? 0
  const sku = activeVariant?.sku ?? (product ? `SKU:${product.slug.replace(/-/g, "").slice(0, 6).toUpperCase()}` : "")
  const salePercent =
    product && product.oldPrice > 0 ? Math.max(1, Math.round(((product.oldPrice - currentPrice) / product.oldPrice) * 100)) : 0

  useEffect(() => {
    if (!product) return
    setSelectedImage((product.gallery[0] ?? product.image ?? "").trim())
    setSelectedSize(product.variants[0]?.name ?? product.weight)
    setQuantity(getCartQuantityForSlug(product.slug))
    setOpenSection(null)
    setRelatedStart(0)
    setThumbStart(0)
    setFavorite(getFavoriteSlugs().includes(product.slug))
  }, [product])

  useEffect(() => {
    if (!product) return
        const syncCartQty = () => {
          const items = getCartItems()
          const qtyMap = items.reduce<Record<string, number>>((acc, item) => {
            acc[item.slug] = item.quantity
            return acc
          }, {})
          setCartQtyBySlug(qtyMap)
        }
    const syncQty = () => setQuantity(getCartQuantityForSlug(product.slug))
    window.addEventListener("ziply5:cart-updated", syncQty)
    window.addEventListener("storage", syncQty)
    return () => {
      window.removeEventListener("ziply5:cart-updated", syncQty)
      window.removeEventListener("storage", syncQty)
    }
  }, [product])

  if (loading) {
    return <section className="flex min-h-[60vh] items-center justify-center bg-[#F3F3F3]">Loading...</section>
  }
  if (error || !product) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center bg-[#F3F3F3]">
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{error || "Product not found"}</p>
      </section>
    )
  }

  return (
    <section className="w-full bg-[#F3F3F3] py-8 md:py-10">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[420px_1fr]">
          <div>
            <div className="rounded-xl border border-[#E2E2E2] bg-[#ECECEC]">
              <div className="relative mx-auto h-90 w-full">
                {displayImage ? (
                  <Image src={displayImage} alt={product.name} fill className="object-contain" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-[#666]">No image</div>
                )}
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                disabled={galleryImages.length <= 4}
                onClick={() => setThumbStart((prev) => (prev - 1 + galleryImages.length) % galleryImages.length)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#D4D4D4] bg-white text-[#555] disabled:opacity-40"
              >
                <ChevronLeft size={14} />
              </button>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {visibleThumbs.map((thumb, idx) => (
                <button
                  type="button"
                  key={`${thumb || "thumb"}-${idx}`}
                  onClick={() => setSelectedImage(thumb)}
                  className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border ${
                    selectedImage === thumb ? "border-[#50272A]" : "border-[#E0E0E0]"
                  }`}
                >
                  <Image src={thumb} alt={`${product.name} preview`} fill className="object-cover" />
                </button>
              ))}
              </div>
              <button
                type="button"
                disabled={galleryImages.length <= 4}
                onClick={() => setThumbStart((prev) => (prev + 1) % galleryImages.length)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#D4D4D4] bg-white text-[#555] disabled:opacity-40"
              >
                <ChevronRight size={14} />
              </button>
            </div>
            {product.videoUrl && (
              <div className="mt-4 overflow-hidden rounded-xl border border-[#E2E2E2] bg-black">
                <video src={product.videoUrl} controls className="w-full" />
              </div>
            )}
          </div>

          <div className="">
            <button
              type="button"
              onClick={() => router.push("/products")}
              className="inline-flex items-center gap-1 rounded-full border border-[#D6D6D6] bg-white px-3 py-1 text-[11px] font-semibold text-[#6B6B6B]"
            >
              <ArrowLeft size={14} />
               Back To Products List
            </button>

            <h1 className="font-heading mt-3 text-6xl leading-none text-[#201A1A]">{product.name}</h1>

            <div className="mt-2 flex items-center gap-2">
              <span className="rounded-full bg-[#F0ECE2] px-3 py-1 text-[12px] font-medium text-[#8D8D8D]">{sku}</span>
              <span className="rounded-full bg-[#DFE8D8] px-3 py-1 text-[12px] font-medium text-[#86917B]">
                {(activeVariant?.stock ?? 0) > 0 ? "instock" : "out of stock"}
              </span>
              {salePercent > 0 && (
                <span className="rounded-md bg-[#2E84CF] px-2 py-1 text-[11px] font-semibold text-white">SALE {salePercent}% Off</span>
              )}
              {product.labels.slice(0, 2).map((label, idx) => (
                <span key={`${label.label || "label"}-${idx}`} className="rounded-md px-2 py-1 text-[11px] font-semibold text-white" style={{ backgroundColor: label.color ?? "#A32424" }}>
                  {label.label}
                </span>
              ))}
              <span
                className={`rounded-md px-2 py-1 text-[11px] font-semibold text-white ${
                  product.type === "veg" ? "bg-[#2EA852]" : "bg-[#A32424]"
                }`}
              >
                {product.type === "veg" ? "Vegetarian" : "Non-Vegetarian"}
              </span>
            </div>

            <div className="mt-3 flex items-end gap-2">
              <p className="text-[28px] font-extrabold text-[#B44444]">₹{currentPrice.toFixed(2)}</p>
              <p className="pb-1 text-sm font-semibold text-[#B8B8B8] line-through">₹{product.oldPrice.toFixed(2)}</p>
            </div>
            <p className="text-sm text-[#8A8A8A]">Taxes included. Shipping calculated at checkout.</p>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#595959]">{product.description}</p>

            <div className="mt-5 flex items-center gap-2">
              <span className="text-xs font-light font-melon tracking-wide text-[#272727]">Size (Wt)</span>
              {(product.variants.length ? product.variants.map((v) => v.name) : [product.weight]).map((size, idx) => (
                <button
                  type="button"
                  key={`${size || "size"}-${idx}`}
                  onClick={() => setSelectedSize(size)}
                  className={`rounded-md border px-3 py-1 text-xs font-semibold ${
                    selectedSize === size
                      ? "border-[#A33838] bg-[#A33838] text-white"
                      : "border-[#D8D8D8] bg-white text-[#696969] hover:border-[#A33838]"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-4">
              <span className="text-xs font-light font-melon tracking-wide text-[#272727]">Add to cart</span>
              <div className="flex items-center overflow-hidden rounded-2xl border border-[#FF8A00] bg-[#5A272A] text-white">
                <button
                  type="button"
                  onClick={() => {
                    const nextQty = Math.max(0, quantity - 1)
                    setCartItemQuantity({ ...product, price: currentPrice, weight: selectedSize }, nextQty)
                    setQuantity(nextQty)
                  }}
                  className="h-10 w-9 text-lg font-bold transition hover:bg-[#6A3033]"
                >
                  -
                </button>
                <span className="w-8 text-center text-sm font-semibold">{quantity}</span>
                <button
                  type="button"
                  onClick={() => {
                    const nextQty = quantity + 1
                    setCartItemQuantity({ ...product, price: currentPrice, weight: selectedSize }, nextQty)
                    setQuantity(nextQty)
                  }}
                  className="h-10 w-9 text-lg font-bold transition hover:bg-[#6A3033]"
                >
                  +
                </button>
              </div>
            </div>
            <p className="mt-4 text-sm font-bold text-[#272727]"><span className="font-light font-melon tracking-wide">Variant:</span> <span>{selectedSize}</span></p>

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  addToCart({ ...product, price: currentPrice, weight: selectedSize }, Math.max(1, quantity))
                  router.push("/cart")
                }}
                className="font-medium font-melon tracking-wide rounded-2xl border border-[#FF8A00] bg-primary flex items-center px-6 py-2.5 text-xl leading-none text-white transition hover:bg-[#e97819]"
              >
                Buy now
                <img src="/assets/Productdetails/rightArrow.png" alt="Buy Now" className="inline-block h-4 w-4 ml-2 object-contain" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const isNowFav = toggleFavoriteSlug(product.slug)
                  setFavorite(isNowFav)
                  router.push("/profile?tab=favorite")
                }}
                className="flex h-10 w-10 items-center justify-center rounded-md border border-[#E5E5E5] text-xl text-[#4C4C4C] hover:text-[#5A272A]"
              >
                {favorite ? "♥" : "♡"}
              </button>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-4 border-t border-[#DEDEDE] pt-5">
              {(product.features.length ? product.features : [{ title: "Home Made", icon: null }]).map((item, idx) => (
                <div key={`${item.title || "feature"}-${idx}`} className="flex flex-col items-center gap-2 text-center">
                  {item.icon ? (
                    <div className="relative h-10 w-10">
                      <Image src={item.icon} alt={item.title} fill className="object-contain" />
                    </div>
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F0ECE2] text-[10px] font-semibold text-[#5A272A]">
                      *
                    </div>
                  )}
                  <p className="text-[11px] font-semibold text-[#333]">{item.title}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
         <div className="mt-8 xl:hidden grid-cols-6 gap-4 hidden lg:grid border-t border-[#DEDEDE] pt-5">
              {product?.features?.length  && (product?.features?.map((item) => (
                <div key={item.title} className="flex flex-col border rounded-2xl py-2 border-[#DEDEDE]] items-center gap-2 text-center">
                  <div className="relative h-10 w-10">
                    <Image src={item.icon || ""} alt={item.title} fill className="object-contain" />
                  </div>
                  <p className="text-[11px] font-semibold text-[#333]">{item.title}</p>
                </div>
              )))}
            </div>
        <div className="mt-10 border-t border-[#DFDFDF]">
          {(product.details.length
            ? product.details
            : [{ title: "Description", content: product.description }]).map((section, idx) => {
            const sectionId = section.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || `section-${idx}`
            const isOpen = openSection === sectionId
            return (
              <div key={sectionId} className="border-b border-[#DFDFDF]">
                <button
                  type="button"
                  onClick={() => setOpenSection(isOpen ? null : sectionId)}
                  className="flex w-full items-center justify-between py-5 text-left"
                >
                  <span className="text-sm font-light font-melon tracking-wide text-[#262626]">{section.title}</span>
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#F58B2E] text-sm font-bold text-white">
                    {isOpen ? "-" : "+"}
                  </span>
                </button>
                {isOpen && (
                  <div
                    className="pb-5 pr-10 text-sm leading-6 text-[#606060]"
                    dangerouslySetInnerHTML={{ __html: section.content }}
                  />
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-10 rounded-2xl bg-[#ECECEC] p-5 sm:p-7 font-melon tracking-wide font-medium">
          <h2 className="font-heading text-6xl uppercase text-[#4A1E1F]">Related Products</h2>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {visibleRelated.map((item, idx) => (
              <div
                key={`${item.id}-${item.slug}-${idx}`}
                onClick={() => router.push(`/product/${item.slug}`)}
                className="block text-left"
              >
                <article
                  className="group rounded-2xl border-2 border-transparent p-3 transition-all duration-300 hover:border-[#F0E4A3]"
                  style={{ backgroundColor: "#3EA6CF" }}
                >
                  <div className="relative mx-auto h-[220px] w-full max-w-[140px]">
                    <Image src={item.image} alt={item.name} fill className="object-contain" />
                  </div>
                  <h3 className="mt-2 text-center text-[22px] font-black uppercase leading-tight text-white">{item.name}</h3>
                  <p className="mt-1 text-center text-[10px] font-semibold uppercase text-white/90">
                    Home style meal | Net wt. {item.weight}
                  </p>
                                    <div className="mt-3 flex items-center justify-between gap-2">
                    {(cartQtyBySlug[product.slug] ?? 0) > 0 ? (
                      <div className="flex items-center rounded-md border border-[#d5c4b8] bg-white/95 px-1 py-0.5">
                        <button
                          type="button"
                          onClick={() => setCartItemQuantity(product, Math.max(0, (cartQtyBySlug[product.slug] ?? 0) - 1))}
                          className="h-6 w-6 rounded text-sm font-light text-[#5A272A] hover:bg-[#f4efec]"
                        >
                          -
                        </button>
                        <span className="min-w-5 text-center text-xs font-light text-[#5A272A]">
                          {cartQtyBySlug[product.slug] ?? 0}
                        </span>
                        <button
                          type="button"
                          onClick={() => setCartItemQuantity(product, (cartQtyBySlug[product.slug] ?? 0) + 1)}
                          className="h-6 w-6 rounded text-sm font-light text-[#5A272A] hover:bg-[#f4efec]"
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

                  <p className="mt-2 text-sm font-medium text-[#FFF5C5]">Rs. {product.price.toFixed(2)}</p>
                </article>
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              disabled={relatedProducts.length === 0}
              onClick={() => setRelatedStart((prev) => (prev - 4 + relatedProducts.length) % relatedProducts.length)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#D4D4D4] bg-white text-[#555] disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              disabled={relatedProducts.length === 0}
              onClick={() => setRelatedStart((prev) => (prev + 4) % relatedProducts.length)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#D4D4D4] bg-white text-[#555] disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
