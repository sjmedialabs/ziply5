"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useReducedMotion } from "framer-motion"
import { useStorefrontProducts } from "@/hooks/useStorefrontProducts"

export default function CollectionBanner({ cmsData }: { cmsData?: any }) {
  const { products: fetchedProducts, loading } = useStorefrontProducts(20)
  const reduceMotion = useReducedMotion()

  const slides = cmsData?.slides || []
  const cmsFallbackBig = slides[0]?.mainImage || "/assets/Homepage/CollectionBigImg.png"
  const displayProducts = useMemo(() => fetchedProducts.filter((p: any) => !p.isCombo).slice(0, 10), [fetchedProducts])

  const items = useMemo(() => {
    if (displayProducts.length > 0) return displayProducts
    return [
      {
        id: "fallback",
        slug: "products",
        image: cmsFallbackBig,
        name: "Explore our collection",
        description: "Fresh veg & non-veg meals crafted for you.",
      },
    ]
  }, [displayProducts, cmsFallbackBig])

  const sectionTitle = cmsData?.title
  const titleWords = sectionTitle ? sectionTitle.split(" ").filter(Boolean) : []

  const iconImage =
    slides?.[0]?.secondaryImage && slides[0].secondaryImage.trim() !== ""
      ? slides[0].secondaryImage
      : "/assets/HomePage/new-icon.png"

  const [activeIndex, setActiveIndex] = useState(0)
  const [swapDir, setSwapDir] = useState<"left" | "right">("right")

  const n = items.length

  useEffect(() => {
    setActiveIndex((i) => Math.min(i, Math.max(0, n - 1)))
  }, [n])

  const currentItem = items[Math.min(activeIndex, Math.max(0, n - 1))]
  const nextItem =
    n > 1
      ? items[(activeIndex + 1) % n]
      : {
        id: "browse-more",
        slug: "products",
        image: cmsFallbackBig,
        name: "See full range",
        description: "Browse every meal in the collection.",
      }

  const bigImageSrc = useMemo(() => {
    if (loading) return cmsFallbackBig
    return currentItem?.image || cmsFallbackBig
  }, [loading, currentItem, cmsFallbackBig])

  const goPrev = () => {
    if (n <= 1) return
    setSwapDir("left")
    setActiveIndex((i) => (i - 1 + n) % n)
  }

  const goNext = () => {
    if (n <= 1) return
    setSwapDir("right")
    setActiveIndex((i) => (i + 1) % n)
  }

  const bigAnimClass =
    reduceMotion || loading
      ? ""
      : swapDir === "right"
        ? "collection-big-swap-right"
        : "collection-big-swap-left"

  return (
    <section className="bg-white py-12 md:py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-12 md:gap-10 items-stretch">
          {/* LEFT BIG IMAGE — no border radius / border; icon not clipped */}
          <div className="relative lg:col-span-7 col-span-12 h-[300px] md:h-[700px] lg:h-[630px]">
            <div className="relative h-full flex items-end justify-center">
              {loading ? (
                <div className="w-full h-full bg-gray-100 animate-pulse" />
              ) : (
                <div
                  key={`${activeIndex}-${bigImageSrc}`}
                  className={`relative h-full w-full min-h-[240px] ${bigAnimClass}`}
                >
                  <Image
                    src={bigImageSrc}
                    alt={currentItem?.name || "Collection"}
                    fill
                    className="object-contain lg:scale-y-125 xl:scale-y-100 xl:scale-x-105"
                    sizes="(max-width: 1024px) 100vw, 58vw"
                    priority={activeIndex === 0}
                  />
                </div>
              )}

              <div className="absolute -top-4 lg:-top-10 -right-4 lg:-right-10 md:-top-8 md:-right-4 z-20 pointer-events-none">
                <Image
                  src={iconImage}
                  alt="new"
                  width={200}
                  height={200}
                  className="w-24 h-24 md:w-40 md:h-40 lg:w-40 lg:h-40"
                />
              </div>
            </div>
          </div>

          {/* RIGHT: preview card = NEXT product (different from left) */}
          <div className="relative justify-between lg:col-span-5 xl:col-span-4 col-span-12 flex flex-col h-full">
            <div className="lg:text-start text-center lg:py-0 py-4">
              <h2 className="text-4xl md:text-5xl font-extrabold font-melon text-[#4B1E1E] leading-tight">
                {sectionTitle ? (
                  <>
                    {titleWords.slice(0, 2).join(" ")}
                    {titleWords.length > 2 && (
                      <>
                        <span className="hidden lg:inline">
                          <br />
                        </span>
                        <span className="inline lg:hidden">{" "}</span>
                      </>
                    )}
                    {titleWords.slice(2, 4).join(" ")}
                    {titleWords.length > 4 && (
                      <>
                        <span className="hidden lg:inline">
                          <br />
                        </span>
                        <span className="inline lg:hidden">{" "}</span>
                      </>
                    )}
                    {titleWords.slice(4).join(" ")}
                  </>
                ) : (
                  <>
                    OUR VEG
                    <span className="hidden lg:inline">
                      <br />
                    </span>
                    <span className="inline lg:hidden"> & </span>
                    NON VEG{" "}
                    <span className="hidden lg:inline">
                      <br />
                    </span>
                    COLLECTION
                  </>
                )}
              </h2>
            </div>

            <div className="relative w-full flex justify-between items-center min-h-[280px] md:min-h-[320px]">
              {loading ? (
                <div className="bg-[#F9FAFB] border-2 border-gray-100 rounded-2xl shadow-md mx-10 md:mx-40 lg:mx-0 lg:mr-12 animate-pulse overflow-hidden w-full max-w-md mx-auto lg:mr-12">
                  <div className="bg-gray-100 h-48 flex justify-center items-center">
                    <div className="w-32 h-32 bg-gray-200 rounded-full" />
                  </div>
                  <div className="py-4 px-6 space-y-2">
                    <div className="h-4 w-3/4 bg-gray-200 rounded" />
                    <div className="h-3 w-1/2 bg-gray-200 rounded" />
                  </div>
                </div>
              ) : (
                <div className="w-full flex justify-center lg:justify-start">
                  <Link href={`/product/${nextItem.slug}`} className="block w-full lg:max-w-md">
                    <div className="card-smooth bg-[#F9FAFB] border-2 border-[#51282B] rounded-2xl shadow-md mx-10 md:mx-40 lg:mx-0 lg:mr-12 cursor-pointer hover:shadow-lg">
                      <div className="bg-green-200 rounded-t-2xl py-8 flex justify-center">
                        <Image
                          src={nextItem.image || "/assets/Homepage/chickenBiryani.png"}
                          alt={nextItem.name}
                          width={200}
                          height={240}
                          className="object-contain"
                        />
                      </div>

                      <div className="py-4 px-6 text-center">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/70 mb-1">
                          {n > 1 ? "Up next" : "Explore"}
                        </p>
                        <h3 className="text-sm uppercase tracking-wide font-bold text-primary line-clamp-2 min-h-[40px] leading-snug">
                          {nextItem.name}
                        </h3>
                        <p className="text-xs text-[#4B1E1E]/80 line-clamp-2 min-h-[32px] mt-1 leading-snug">
                          {nextItem.description || nextItem.subtitle || "\u00a0"}
                        </p>
                      </div>
                    </div>
                  </Link>
                </div>
              )}

              <div>
                <button
                  type="button"
                  aria-label="Previous product"
                  onClick={goPrev}
                  disabled={n <= 1}
                  className="collection-banner-prev absolute left-2/5 lg:left-88 lg:right-0 -translate-y-1/2 -bottom-15 lg:top-2/5 z-10 w-9 h-9 border-2 border-primary rounded-full shadow flex items-center justify-center transition-transform duration-300 hover:scale-105 disabled:opacity-40 disabled:pointer-events-none"
                >
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <button
                  type="button"
                  aria-label="Next product"
                  onClick={goNext}
                  disabled={n <= 1}
                  className="collection-banner-next absolute right-2/5 lg:right-0 -translate-y-1/2 -bottom-15 lg:top-1/2 z-10 w-9 h-9 border-2 border-primary rounded-full shadow flex items-center justify-center transition-transform duration-300 hover:scale-105 disabled:opacity-40 disabled:pointer-events-none"
                >
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
