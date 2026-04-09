"use client"

import Link from "next/link"
import Image from "next/image"
import { useHorizontalScroll } from "../hooks/useHorizontalScroll"

const categories = [
  { id: 1, name: "Cashew Delight Upma", subtitle: "A Perfect Blend Of Flavors & Nutrition", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/drink.png-Bn98EV0Y9ho9LurBeWpUqNxRPM9o2p.png" },
  { id: 2, name: "Plan Rava Upma", subtitle: "A Perfect Blend Of Flavors & Nutrition", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/fruit.png-zkxgWG2CoPWuSifvMhWWBgnIXsrdzw.png" },
  { id: 3, name: "Cashew Chicken", subtitle: "A Perfect Blend Of Flavors & Nutrition", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/drink.png-Bn98EV0Y9ho9LurBeWpUqNxRPM9o2p.png" },
  { id: 4, name: "Prawns Biryani", subtitle: "A Perfect Blend Of Flavors & Nutrition", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Burger.png-KL84dDVpks5I4G2XOUmLsuqHZq8eBz.png" },
  { id: 5, name: "Cashew Delight Upma", subtitle: "A Perfect Blend Of Flavors & Nutrition", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/drink.png-Bn98EV0Y9ho9LurBeWpUqNxRPM9o2p.png" },
  { id: 6, name: "Chicken Biryani", subtitle: "A Perfect Blend Of Flavors & Nutrition", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beef.png-2CUGA48h1jJI07o8jBTnyTXuCL8mHr.png" },
  { id: 7, name: "Panner Curry Rice", subtitle: "A Perfect Blend Of Flavors & Nutrition", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beef.png-2CUGA48h1jJI07o8jBTnyTXuCL8mHr.png" },
]

export default function ProductCategories() {
  const { scrollRef, scroll } = useHorizontalScroll<HTMLDivElement>(200)

  return (
    <section id="products" className="w-screen h-screen bg-[#F97316] flex flex-col items-center justify-center p-4 md:p-8 overflow-hidden">
      <div className="w-full max-w-6xl px-4 sm:px-6 lg:px-8 flex flex-col items-center flex-1">
        <h2 className="font-heading text-2xl md:text-3xl lg:text-4xl font-extrabold text-white text-center mb-6 md:mb-8 tracking-wide">
          OUR PRODUCTS
        </h2>
        <div className="relative flex items-center w-full">
          <button onClick={() => scroll("left")} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white rounded-full flex items-center justify-center transition-all duration-300 hover:-translate-y-1/2 hover:scale-105" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <svg className="w-4 h-4 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          
          <div ref={scrollRef} className="flex gap-6 overflow-x-auto scrollbar-hide px-12 py-4 w-full max-w-4xl mx-auto mt-4" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
            {categories.map((category) => (
              <Link key={category.id} href={`/product/${category.name.toLowerCase().replace(/\s+/g, "-")}`} className="flex-shrink-0 group">
                <div className="bg-white rounded-full w-[140px] md:w-[180px] h-[220px] md:h-[260px] flex flex-col items-center pt-5 pb-5 px-4 transition-all duration-300 group-hover:-translate-y-1 group-hover:scale-[1.03]" style={{ boxShadow: '0 8px 20px rgba(0,0,0,0.08)' }}>
                  <div className="w-[80px] h-[80px] md:w-[100px] md:h-[100px] rounded-full overflow-hidden mb-4 flex-shrink-0">
                    <Image src={category.image} alt={category.name} width={100} height={100} className="w-full h-full object-cover" />
                  </div>
                  <h3 className="font-semibold text-[#5B2C2C] text-center text-[14px] md:text-[15px] leading-tight mb-1.5">
                    {category.name}
                  </h3>
                  <p className="text-[#8B8B8B] text-[11px] md:text-[12px] text-center leading-tight px-1 line-clamp-2">
                    {category.subtitle}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          <button onClick={() => scroll("right")} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white rounded-full flex items-center justify-center transition-all duration-300 hover:-translate-y-1/2 hover:scale-105" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <svg className="w-4 h-4 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>
    </section>
  )
}

