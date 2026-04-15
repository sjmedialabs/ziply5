"use client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import SectionHeader from "./SectionHeader"
import { getCartItems, setCartItemQuantity } from "@/lib/cart"
import { getFavoriteSlugs, toggleFavoriteSlug } from "@/lib/favorites"
import { useStorefrontProducts } from "@/hooks/useStorefrontProducts"

export default function BestSellers() {
  const { products } = useStorefrontProducts(20)
  const [favoriteSlugs, setFavoriteSlugs] = useState<string[]>([])
  const [cartQtyBySlug, setCartQtyBySlug] = useState<Record<string, number>>({})
  const bestSellers = useMemo(() => products.slice(0, 6), [products])
      console.log("Products on ui hook:", products)
  const router = useRouter()
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

  return (
    <section id="best-sellers" className="bg-[#FFF5C5] py-12 md:py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4">
        <SectionHeader title="BEST SELLERS" linkHref="/#best-sellers" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 justify-items-center">
          {bestSellers.map((product) => (
            <div key={product.id} className="w-full max-w-sm group cursor-pointer font-melon" onClick={() =>
              router.push(`/product/${product.name.toLowerCase().replace(/\s+/g, "-")}`)
            }>
              <div
                className="rounded-2xl px-8 relative overflow-hidden transition-all duration-300 group-hover:ring-4 group-hover:ring-[#F36E21] group-hover:shadow-xl h-full flex flex-col"
                style={{ backgroundColor: "#3EA6CF" }}
              >
                {product.type === "non-veg" && (
                  <span className="absolute top-4 right-0 bg-[#F97316] text-white text-[11px] font-medium px-3 py-1 rounded-l-sm border border-white z-10">
                    Non-veg
                  </span>
                )}
                {product.type === "veg" && (
                  <span className="absolute top-4 right-0 bg-[#10B981] text-white text-[11px] font-medium px-3 py-1 border border-white rounded-l-sm z-10">
                    Pure-Veg
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => {
                    toggleFavoriteSlug(product.slug)
                    setFavoriteSlugs(getFavoriteSlugs())
                  }}
                  className="absolute left-4 top-4 z-20 rounded-full bg-white/90 px-2 py-1 text-sm text-[#7a1e0e]"
                >
                  {favoriteSlugs.includes(product.slug) ? "♥" : "♡"}
                </button>

                <div className="relative h-full flex items-center justify-center py-4">
                  <Image src={product.image} alt={product.name} width={180} height={220} className="w-auto h-full object-contain drop-shadow-lg group-hover:scale-105 transition-transform duration-300" />
                </div>

                <div className="text-center pb-4">
                  <h3 className="font-medium text-white text-[15px] md:text-xl leading-tight tracking-wide">
                    {product.name}
                  </h3>
                  <p className="text-[#FFF5C5] text-[11px] uppercase tracking-wide line-clamp-1">
                    {product.description}
                  </p>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    {(cartQtyBySlug[product.slug] ?? 0) > 0 ? (
                      <div className="flex items-center rounded-md border border-[#d5c4b8] bg-white/95 px-1 py-0.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCartItemQuantity(product, Math.max(0, (cartQtyBySlug[product.slug] ?? 0) - 1));
                          }}
                          className="h-6 w-6 rounded text-sm font-light text-[#5A272A] hover:bg-[#f4efec]"
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
                          className="h-6 w-6 rounded text-sm font-light text-[#5A272A] hover:bg-[#f4efec]"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCartItemQuantity(product, 1);
                        }}
                        className="rounded-lg border border-white tracking-wide px-4 py-1.5 text-[12px] font-light text-white hover:bg-primary hover:text-white transition-all "
                      >
                        Add to Cart
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push("/checkout")
                      }} className="rounded-lg bg-primary tracking-wide px-3 py-1.5 text-[12px] font-light text-white hover:bg-[#2d1011]">
                      Buy Now
                    </button>
                  </div>

                  <p className="mt-2 text-sm font-medium text-[#FFF5C5]">Rs. {product.price.toFixed(2)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}