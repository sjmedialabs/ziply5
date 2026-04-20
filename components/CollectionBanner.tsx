"use client"

import Image from "next/image"
import { Swiper, SwiperSlide } from "swiper/react"
import { Navigation } from "swiper/modules"
import "swiper/css"
import "swiper/css/navigation"

const products = [
  {
    id: 1,
    name: "CHICKPEA PUFFS",
    subtitle: "Jalapeño Cheddar Blaze",
    image: "/assets/Homepage/chickenBiryani.png",
  },
  {
    id: 2,
    name: "SPICY RICE",
    subtitle: "Masala Blast",
    image: "/assets/Homepage/chickenBiryani.png",
  },
  {
    id: 3,
    name: "VEG DELIGHT",
    subtitle: "Healthy Mix",
    image: "/assets/Homepage/chickenBiryani.png",
  },
]

export default function CollectionBanner({ cmsData }: { cmsData?: any }) {

  const slides = cmsData?.slides || []

  const displayProducts = cmsData?.items?.length > 0 ? cmsData.items : products;
  const bigImage = slides[0]?.mainImage || "/assets/Homepage/CollectionBigImg.png";

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
          <div className="relative lg:col-span-7 col-span-12 h-[300px] md:h-[700px] lg:h-full">
            <div className="relative rounded-3xl h-full flex items-end justify-center">

              <Image
                src={bigImage}
                alt="Collection"
                fill
                className="object-contain lg:scale-y-125 xl:scale-y-100 xl:scale-x-105"
              />

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
                OUR VEG<span className="hidden lg:inline"><br /></span><span className="inline lg:hidden"> & </span>
                NON VEG <span className="hidden lg:inline"><br /></span>
                COLLECTION
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
                {displayProducts.map((item: any, i: number) => (
                  <SwiperSlide key={item.id || i}>
                    <div className="bg-[#F9FAFB] border-2 border-[#51282B] rounded-2xl shadow-md mx-10 md:mx-40 lg:mx-0 lg:mr-12">

                      <div className="bg-green-200 rounded-t-2xl py-8 flex justify-center">
                        <Image
                          src={item.image || '/assets/Homepage/chickenBiryani.png'}
                          alt={item.name}
                          width={200}
                          height={240}
                          className=""
                        />
                      </div>

                      <div className="py-4 px-6">
                        <h3 className="text-sm uppercase tracking-wide font-bold text-primary">
                          {item.name}
                        </h3>
                        <p className="text-xs capitalize text-green-600">
                          {item.subtitle}
                        </p>
                      </div>

                    </div>
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