"use client";

import Link from "next/link";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";

import "swiper/css";
import "swiper/css/navigation";

const categories = [{ id: 1, name: "Cashew Delight Upma", subtitle: "A Perfect Blend Of Flavors & Nutrition", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/drink.png-Bn98EV0Y9ho9LurBeWpUqNxRPM9o2p.png" },
   { id: 2, name: "Plan Rava Upma", subtitle: "A Perfect Blend Of Flavors & Nutrition", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/fruit.png-zkxgWG2CoPWuSifvMhWWBgnIXsrdzw.png" },
    { id: 3, name: "Cashew Chicken", subtitle: "A Perfect Blend Of Flavors & Nutrition", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/drink.png-Bn98EV0Y9ho9LurBeWpUqNxRPM9o2p.png" },
     { id: 4, name: "Prawns Biryani", subtitle: "A Perfect Blend Of Flavors & Nutrition", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Burger.png-KL84dDVpks5I4G2XOUmLsuqHZq8eBz.png" },
      { id: 5, name: "Cashew Delight Upma", subtitle: "A Perfect Blend Of Flavors & Nutrition", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/drink.png-Bn98EV0Y9ho9LurBeWpUqNxRPM9o2p.png" },
       { id: 6, name: "Chicken Biryani", subtitle: "A Perfect Blend Of Flavors & Nutrition", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beef.png-2CUGA48h1jJI07o8jBTnyTXuCL8mHr.png" },
        { id: 7, name: "Panner Curry Rice", subtitle: "A Perfect Blend Of Flavors & Nutrition", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beef.png-2CUGA48h1jJI07o8jBTnyTXuCL8mHr.png" },
         { id: 8, name: "Veg Biryani", subtitle: "A Perfect Blend Of Flavors & Nutrition", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beef.png-2CUGA48h1jJI07o8jBTnyTXuCL8mHr.png" },]

export default function ProductCategories() {
  return (
    <section className="w-full bg-[#F97316] py-12 relative">
      <div className="max-w-7xl mx-auto px-4 relative">

        <h2 className="text-center font-melon text-white text-3xl font-extrabold mb-8">
          OUR PRODUCTS
        </h2>

        {/* Swiper */}
        <Swiper
          modules={[Navigation]}
          spaceBetween={16}
          slidesPerView={7}
          navigation={{
            nextEl: ".custom-next",
            prevEl: ".custom-prev",
          }}
          breakpoints={{
            320: { slidesPerView: 2 },
            480: { slidesPerView: 3 },
            768: { slidesPerView: 4 },
            1024: { slidesPerView: 5 },
            1280: { slidesPerView: 7 },
          }}
          style={{padding: "10px 12px"}}
        >
          {categories.map((category) => (
            <SwiperSlide key={category.id}>
              <Link
                href={`/product/${category.name
                  .toLowerCase()
                  .replace(/\s+/g, "-")}`}
              >
                <div className="bg-white rounded-full h-[300px] flex flex-col justify-between pt-4 pb-8 items-center px-2 shadow-md transition hover:scale-105">

                  <div className="w-[120px] h-[120px] rounded-full overflow-hidden mb-4">
                    <Image
                      src={category.image}
                      alt={category.name}
                      width={120}
                      height={120}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <div className="mb-4">
                  <h3 className="text-[#6F2C2A] text-center font-semibold text-sm">
                    {category.name}
                  </h3>

                  <p className="text-[#656565] text-[10px] text-center mt-1 line-clamp-2">
                    {category.subtitle}
                  </p>
                  </div>
                </div>
              </Link>
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Custom Arrows */}
        <button className="custom-prev absolute left-0 xl:-left-8 mt-8 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow flex items-center justify-center">
        <svg className="w-4 h-4 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>

        <button className="custom-next absolute right-0 xl:-right-8 mt-8 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow flex items-center justify-center">
          <svg className="w-4 h-4 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
    </section>
  );
}