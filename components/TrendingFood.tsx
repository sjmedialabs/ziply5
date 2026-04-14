"use client"

import Link from "next/link"
import Image from "next/image"
import SectionHeader from "./SectionHeader"
import { useEffect, useMemo, useState } from "react"
import { getCartItems, setCartItemQuantity } from "@/lib/cart"
import { getFavoriteSlugs, toggleFavoriteSlug } from "@/lib/favorites"
import { useStorefrontProducts } from "@/hooks/useStorefrontProducts"

function useIsLg() {
  const [isLg, setIsLg] = useState(false)

  useEffect(() => {
    const check = () => {
      setIsLg(window.innerWidth >= 1024 && window.innerWidth < 1280)
    }

    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  return isLg
}

const cardGradients = [
  "from-[#5B9BD5] to-[#3A7FC2]",
  "from-[#A78BDA] to-[#8B6FC0]",
  "from-[#8BC34A] to-[#689F38]",
  "from-[#4A90D9] to-[#2E6EB5]",
]

export default function TrendingFood() {
  const isLg = useIsLg()
  const { products } = useStorefrontProducts(40)
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

  const trendingProducts = useMemo(() => products.slice(0, 4), [])
  const visibleProducts = isLg ? trendingProducts.slice(0, 3) : trendingProducts

  return (
    <section id="trending" className="bg-[#F3F4F6] py-12 md:py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4">
        <SectionHeader title="FOOD THAT'S TRENDING" linkHref="/#trending" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 justify-items-center">
          {visibleProducts.map((product, index) => (
            <div
              key={product.id}
              className="w-full max-w-sm group bg-white rounded-[16px] overflow-hidden 
              transition-all duration-300  h-85
              shadow-[0_10px_25px_rgba(0,0,0,0.08)] 
              hover:shadow-[0_15px_35px_rgba(0,0,0,0.12)]
              hover:ring-2 hover:ring-[#EF4444]"
            >
              {/* FLEX CONTAINER */}
              <div className="flex flex-col h-full">

                {/* IMAGE SECTION */}
                <div
                  className={`relative bg-gradient-to-b ${cardGradients[index % cardGradients.length]} 
                  flex items-center justify-center 
                  h-[280px] group-hover:-mt-10`}
                >
                  {/* veg icon */}
                  <div className="absolute top-3 z-20 right-3 w-5 h-5 bg-white rounded-sm flex items-center justify-center">
                    <div
                      className={`w-3 h-3 rounded-sm flex items-center justify-center border-2 ${product.type === "veg" ? "border-green-600" : "border-red-600"
                        }`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${product.type === "veg" ? "bg-green-600" : "bg-red-600"}`}></div>
                    </div>
                  </div>
                  <div className="relative h-full w-full">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-contain p-4"
                      sizes="(max-width: 768px) 100vw, 320px"
                    />
                  </div>
                </div>

                {/* CONTENT SECTION */}
                <div className="flex flex-col px-4 font-melon  py-4">
                  <div className="flex flex-row justify-between items-center">

                    <div className="px-2 overflow-hidden">
                      {/* TITLE */}
                      <h3 className="font-medium uppercase text-primary  text-[14px] mb-1 truncate">
                        {product.name}
                      </h3>

                      {/* SUBTITLE */}
                      <p
                        className={`text-[12px] font-medium capitalize truncate bg-gradient-to-r ${cardGradients[index % cardGradients.length]} bg-clip-text text-transparent`}
                      >
                        {product.description}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        toggleFavoriteSlug(product.slug)
                        setFavoriteSlugs(getFavoriteSlugs())
                      }}
                      className="border-2 border-[#EF4444] px-2.5 py-1 rounded-lg text-[12px] font-medium hover:bg-[#EF4444] hover:text-white transition-colors"
                    >
                      {favoriteSlugs.includes(product.slug) ? "♥" : "♡"}
                    </button>
                  </div>

                  <div className="mt-2 flex max-h-0 flex-col gap-2 overflow-hidden opacity-0 transition-all duration-300 group-hover:max-h-24 group-hover:opacity-100">
                    <span className="font-medium text-[#F97316] text-[16px]">Rs. {product.price.toFixed(2)}</span>
                    <div className="flex items-center justify-between gap-2">

                      {(cartQtyBySlug[product.slug] ?? 0) > 0 ? (
                        <div className="flex items-center rounded-md border border-[#d5c4b8] px-1 py-0.5">
                          <button
                            type="button"
                            onClick={() => setCartItemQuantity(product, Math.max(0, (cartQtyBySlug[product.slug] ?? 0) - 1))}
                            className="h-6 w-6 rounded text-sm font-bold text-[#5A272A] hover:bg-[#f4efec]"
                          >
                            -
                          </button>
                          <span className="min-w-5 text-center text-xs font-bold text-[#5A272A]">{cartQtyBySlug[product.slug] ?? 0}</span>
                          <button
                            type="button"
                            onClick={() => setCartItemQuantity(product, (cartQtyBySlug[product.slug] ?? 0) + 1)}
                            className="h-6 w-6 rounded text-sm font-bold text-[#5A272A] hover:bg-[#f4efec]"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setCartItemQuantity(product, 1)}
                          className="rounded-lg border border-primary tracking-wide px-4 py-1.5 text-[12px] font-light text-primary hover:bg-primary hover:text-white transition-all "
                        >
                          Add to Cart
                        </button>
                      )}
                      <Link
                        href="/checkout"
                        className="rounded-md bg-primary px-3 tracking-wide py-1.5 text-[12px] font-light text-white hover:bg-[#3a1517]"
                      >
                        Buy Now
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}