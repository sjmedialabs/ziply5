"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react"
import { getProductBySlug, products } from "@/lib/products"
import { getFavoriteSlugs, toggleFavoriteSlug } from "@/lib/favorites"
import { addToCart, getCartQuantityForSlug, setCartItemQuantity } from "@/lib/cart"

export default function ProductPage() {
  const params = useParams()
  const router = useRouter()
  const slugParam = params?.slug
  const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam
  const product = useMemo(() => {
    const found = slug ? getProductBySlug(slug) : undefined
    if (found) return found

    const fallbackName = slug
      ? slug
          .split("-")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ")
      : "Product"

    return {
      id: 0,
      name: fallbackName,
      slug: slug || "product",
      price: 229.25,
      oldPrice: 310,
      serving: "440 calories serving",
      weight: "95 g",
      description:
        "A balanced home-style meal made for convenience and flavor. Prepared with quality ingredients and crafted for everyday comfort.",
      type: "non-veg" as const,
      category: "ready-to-eat" as const,
      image: "/assets/product listing/Ziply5 - Pouch - Butter Chk Rice 3.png",
      detailImage: "/assets/Product details/image 69.png",
      bgColor: "#3EA6CF",
      gallery: [
        "/assets/Product details/Rectangle.png",
        "/assets/Product details/Rectangle-1.png",
        "/assets/Product details/Rectangle-2.png",
        "/assets/Product details/Frame 341.png",
      ],
    }
  }, [slug])

  const [quantity, setQuantity] = useState(1)
  const [selectedSize, setSelectedSize] = useState("250g")
  const [openSection, setOpenSection] = useState<string | null>(null)
  const [favorite, setFavorite] = useState(false)
  const [relatedStart, setRelatedStart] = useState(0)

  const relatedProducts = useMemo(() => products.filter((item) => item.id !== product.id), [product])

  const productGallery = useMemo(
    () => [
      "/assets/Productdetails/selected.png",
      "/assets/Productdetails/pdp-thumb-1.png",
      "/assets/Productdetails/pdp-thumb-2.png",
      "/assets/Productdetails/pdp-thumb-3.png",
    ],
    [],
  )

  const [selectedImage, setSelectedImage] = useState("/assets/Productdetails/selected.png")

  const visibleRelated = useMemo(() => {
    if (relatedProducts.length === 0) return []
    return Array.from({ length: 4 }).map((_, index) => {
      const item = relatedProducts[(relatedStart + index) % relatedProducts.length]
      return item
    })
  }, [relatedProducts, relatedStart])

  const sku = `SKU:${product.slug.replace(/-/g, "").slice(0, 6).toUpperCase()}`
  const salePercent = Math.max(1, Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100))

  useEffect(() => {
    setSelectedImage("/assets/Productdetails/selected.png")
    setSelectedSize("250g")
    setQuantity(getCartQuantityForSlug(product.slug))
    setOpenSection(null)
    setRelatedStart(0)
    setFavorite(getFavoriteSlugs().includes(product.slug))
  }, [product.slug])

  useEffect(() => {
    const syncQty = () => setQuantity(getCartQuantityForSlug(product.slug))
    window.addEventListener("ziply5:cart-updated", syncQty)
    window.addEventListener("storage", syncQty)
    return () => {
      window.removeEventListener("ziply5:cart-updated", syncQty)
      window.removeEventListener("storage", syncQty)
    }
  }, [product.slug])

  const detailSections = [
    {
      id: "key-features",
      title: "Key Features",
      content:
        "Authentic flavor profile, balanced spice blend, and quick preparation. Crafted to deliver home-style taste without compromise.",
    },
    {
      id: "ingredients",
      title: "Ingredients",
      content:
        "Rice, chicken, spices, dehydrated vegetables, salt, natural flavoring agents, and edible oil. No added preservatives.",
    },
    {
      id: "nutrition-facts",
      title: "Nutrition Facts",
      content:
        "Approximate values per serving: energy, protein, carbohydrates, and fats are optimized for a complete meal format.",
    },
    {
      id: "storage",
      title: "Storage Instructions",
      content:
        "Store in a cool, dry place away from direct sunlight. Keep pack tightly sealed after opening for best freshness.",
    },
  ]

  const featureItems = [
    { label: "Home Made", icon: "/assets/Productdetails/home.png" },
    { label: "Flavourful", icon: "/assets/Productdetails/flavourful.png" },
    { label: "Travel Friendly", icon: "/assets/Productdetails/travelFriendly.png" },
    { label: "No MSG, Preservatives", icon: "/assets/Productdetails/noPreservative.png" },
    { label: "FREE Shipping", icon: "/assets/Productdetails/free-shipping.png" },
    { label: "Easy Return 30 Days", icon: "/assets/Productdetails/easyReturn.png" },
  ]

  return (
    <section className="w-full bg-[#F3F3F3] py-8 md:py-10">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[420px_1fr]">
          <div>
            <div className="rounded-xl border border-[#E2E2E2] bg-[#ECECEC]">
              <div className="relative mx-auto h-90 w-full">
                <Image src={selectedImage} alt={product.name} fill className="object-contain" />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1">
              {productGallery.map((thumb) => (
                <button
                  type="button"
                  key={thumb}
                  onClick={() => setSelectedImage(thumb)}
                  className={`relative h-40 w-40 flex-shrink-0 overflow-hidden rounded-md border ${
                    selectedImage === thumb ? "border-[#50272A]" : "border-[#E0E0E0]"
                  }`}
                >
                  <Image src={thumb} alt={`${product.name} preview`} fill className="object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
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
              <span className="rounded-full bg-[#DFE8D8] px-3 py-1 text-[12px] font-medium text-[#86917B]">instock</span>
              <span className="rounded-md bg-[#2E84CF] px-2 py-1 text-[11px] font-semibold text-white">SALE {salePercent}% Off</span>
              <span
                className={`rounded-md px-2 py-1 text-[11px] font-semibold text-white ${
                  product.type === "veg" ? "bg-[#2EA852]" : "bg-[#A32424]"
                }`}
              >
                {product.type === "veg" ? "Vegetarian" : "Non-Vegetarian"}
              </span>
            </div>

            <div className="mt-3 flex items-end gap-2">
              <p className="text-[28px] font-extrabold text-[#B44444]">₹{product.price.toFixed(2)}</p>
              <p className="pb-1 text-sm font-semibold text-[#B8B8B8] line-through">₹{product.oldPrice.toFixed(2)}</p>
            </div>
            <p className="text-sm text-[#8A8A8A]">Taxes included. Shipping calculated at checkout.</p>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#595959]">{product.description}</p>

            <div className="mt-5 flex items-center gap-2">
              <span className="text-xs font-light font-melon tracking-wide text-[#272727]">Size (Wt)</span>
              {["250g", "500g", "1 kg"].map((size) => (
                <button
                  type="button"
                  key={size}
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
                    setCartItemQuantity(product, nextQty)
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
                    setCartItemQuantity(product, nextQty)
                    setQuantity(nextQty)
                  }}
                  className="h-10 w-9 text-lg font-bold transition hover:bg-[#6A3033]"
                >
                  +
                </button>
              </div>
            </div>
            <p className="mt-4 text-sm font-bold text-[#272727]"><span className="font-light font-melon tracking-wide">Shelf Life:</span> <span className="font-bo;d">12 months</span></p>

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  addToCart(product, Math.max(1, quantity))
                  router.push("/cart")
                }}
                className="font-heading rounded-2xl border border-[#FF8A00] bg-primary flex items-center px-6 py-2.5 text-xl leading-none text-white transition hover:bg-[#e97819]"
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
              {featureItems.map((item) => (
                <div key={item.label} className="flex flex-col items-center gap-2 text-center">
                  <div className="relative h-10 w-10">
                    <Image src={item.icon} alt={item.label} fill className="object-contain" />
                  </div>
                  <p className="text-[11px] font-semibold text-[#333]">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-[#DFDFDF]">
          {detailSections.map((section) => {
            const isOpen = openSection === section.id
            return (
              <div key={section.id} className="border-b border-[#DFDFDF]">
                <button
                  type="button"
                  onClick={() => setOpenSection(isOpen ? null : section.id)}
                  className="flex w-full items-center justify-between py-5 text-left"
                >
                  <span className="text-sm font-light font-melon tracking-wide text-[#262626]">{section.title}</span>
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#F58B2E] text-sm font-bold text-white">
                    {isOpen ? "-" : "+"}
                  </span>
                </button>
                {isOpen && (
                  <p className="pb-5 pr-10 text-sm leading-6 text-[#606060]">
                    {section.content}
                  </p>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-10 rounded-2xl bg-[#ECECEC] p-5 sm:p-7">
          <h2 className="font-heading text-6xl uppercase text-[#4A1E1F]">Related Products</h2>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {visibleRelated.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => router.push(`/product/${item.slug}`)}
                className="block text-left"
              >
                <article
                  className="group rounded-2xl border-2 border-transparent p-3 transition-all duration-300 hover:border-[#F0E4A3]"
                  style={{ backgroundColor: item.bgColor }}
                >
                  <div className="relative mx-auto h-[220px] w-full max-w-[140px]">
                    <Image src={item.image} alt={item.name} fill className="object-contain" />
                  </div>
                  <h3 className="mt-2 text-center text-[22px] font-black uppercase leading-tight text-white">{item.name}</h3>
                  <p className="mt-1 text-center text-[10px] font-semibold uppercase text-white/90">
                    {item.serving} | Net wt. {item.weight}
                  </p>
                </article>
              </button>
            ))}
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setRelatedStart((prev) => (prev - 4 + relatedProducts.length) % relatedProducts.length)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#D4D4D4] bg-white text-[#555]"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => setRelatedStart((prev) => (prev + 4) % relatedProducts.length)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#D4D4D4] bg-white text-[#555]"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
