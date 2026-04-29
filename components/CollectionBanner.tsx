"use client"

import Image from "next/image"
import Link from "next/link"
import { useMemo } from "react"
import { Swiper, SwiperSlide } from "swiper/react"
import { Navigation } from "swiper/modules"
import { useStorefrontProducts } from "@/hooks/useStorefrontProducts"
import "swiper/css"
import "swiper/css/navigation"

export default function CollectionBanner({ cmsData }: { cmsData?: any }) {
  const { products: fetchedProducts, loading } = useStorefrontProducts(20)

  const slides = cmsData?.slides || []
  const displayProducts = useMemo(() => fetchedProducts.slice(0, 6), [fetchedProducts]);

  const bigImage = slides[0]?.mainImage || "/assets/Homepage/CollectionBigImg.png";
  const sectionTitle = cmsData?.title;
  const titleWords = sectionTitle ? sectionTitle.split(" ").filter(Boolean) : [];

  // secondary image handling
  const iconImage =
  slides?.[0]?.secondaryImage && slides[0].secondaryImage.trim() !== ""
    ? slides[0].secondaryImage
    : "/assets/HomePage/new-icon.png";

  return (
    <section className="bg-white py-12 md:py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4">

        <div className="grid grid-cols-12 md:gap-10 items-stretch ">

          {/* LEFT BIG IMAGE */}
          <div className="relative lg:col-span-7 col-span-12 h-[300px] md:h-[700px] lg:h-[630px]">
            <div className="relative rounded-3xl h-full flex items-end justify-center">

              {loading ? (
                <div className="w-full h-full bg-gray-100 animate-pulse rounded-3xl" />
              ) : (
                <Image
                  src={bigImage}
                  alt="Collection"
                  fill
                  className="object-contain lg:scale-y-125 xl:scale-y-100 xl:scale-x-105"
                />
              )}

              {/* NEW ICON */}
              <div className="absolute -top-4 lg:-top-10 -right-4 lg:-right-10 md:-top-8 md:-right-4">
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

          {/* RIGHT CONTENT */}
          <div className="relative justify-between lg:col-span-5 xl:col-span-4 col-span-12 flex flex-col h-full">
            <div className="lg:text-start text-center lg:py-0 py-4">
              <h2 className="text-4xl md:text-5xl font-extrabold font-melon text-[#4B1E1E] leading-tight">
                {sectionTitle ? (
                  <>
                    {titleWords.slice(0, 2).join(" ")}
                    {titleWords.length > 2 && (
                      <>
                        <span className="hidden lg:inline"><br /></span>
                        <span className="inline lg:hidden">{" "}</span>
                      </>
                    )}
                    {titleWords.slice(2, 4).join(" ")}
                    {titleWords.length > 4 && (
                      <>
                        <span className="hidden lg:inline"><br /></span>
                        <span className="inline lg:hidden">{" "}</span>
                      </>
                    )}
                    {titleWords.slice(4).join(" ")}
                  </>
                ) : (
                  <>
                    OUR VEG<span className="hidden lg:inline"><br /></span><span className="inline lg:hidden"> & </span>
                    NON VEG <span className="hidden lg:inline"><br /></span>
                    COLLECTION
                  </>
                )}
              </h2>
            </div>

            {/* SWIPER */}
            <div className="relative flex justify-between items-center">

              <Swiper
                modules={[Navigation]}
                spaceBetween={20}
                slidesPerView={1}
                navigation={{
                  nextEl: ".custom-next",
                  prevEl: ".custom-prev",
                }}
                className=""
              >
                {loading
                  ? Array.from({ length: 1 }).map((_, i) => (
                      <SwiperSlide key={`banner-skeleton-${i}`}>
                        <div className="bg-[#F9FAFB] border-2 border-gray-100 rounded-2xl shadow-md mx-10 md:mx-40 lg:mx-0 lg:mr-12 animate-pulse overflow-hidden">
                          <div className="bg-gray-100 h-48 flex justify-center items-center">
                             <div className="w-32 h-32 bg-gray-200 rounded-full" />
                          </div>
                          <div className="py-4 px-6 space-y-2">
                            <div className="h-4 w-3/4 bg-gray-200 rounded" />
                            <div className="h-3 w-1/2 bg-gray-200 rounded" />
                          </div>
                        </div>
                      </SwiperSlide>
                    ))
                  : displayProducts.map((item: any, i: number) => (
                      <SwiperSlide key={item.id || i}>
                        <Link href={`/product/${item.slug}`}>
                          <div className="bg-[#F9FAFB] border-2 border-[#51282B] rounded-2xl shadow-md mx-10 md:mx-40 lg:mx-0 lg:mr-12 cursor-pointer hover:shadow-lg transition-all">

                            <div className="bg-green-200 rounded-t-2xl py-8 flex justify-center">
                              <Image
                                src={item.image || '/assets/Homepage/chickenBiryani.png'}
                                alt={item.name}
                                width={200}
                                height={240}
                                className="object-contain"
                              />
                            </div>

                            <div className="py-4 px-6">
                              <h3 className="text-sm uppercase tracking-wide font-bold text-primary truncate">
                                {item.name}
                              </h3>
                              <p className="text-xs capitalize text-green-600 truncate">
                                {item.description || item.subtitle}
                              </p>
                            </div>

                          </div>
                        </Link>
                      </SwiperSlide>
                    ))}
              </Swiper>

              {/* CUSTOM ARROWS */}
              <div>
                <button className="custom-prev absolute left-2/5 lg:left-88 lg:right-0 -translate-y-1/2 -bottom-20 lg:top-2/5 z-10 w-9 h-9 border-2 border-primary rounded-full shadow flex items-center justify-center">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <button className="custom-next absolute right-2/5 lg:right-0 -translate-y-1/2 -bottom-20 lg:top-1/2 z-10 w-9 h-9 border-2 border-primary rounded-full shadow flex items-center justify-center">
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