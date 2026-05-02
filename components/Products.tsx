"use client"

import Link from "next/link"
import Image from "next/image"
import { useScroll } from "../hooks/useScroll"
import { useEffect, useState } from "react"

const categories = [
  { id: 1, name: "Cashew Delight Upma", subtitle: "A Perfect Blend Of Flavors & Nutrition", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/drink.png-Bn98EV0Y9ho9LurBeWpUqNxRPM9o2p.png" },
  { id: 2, name: "Plan Rava Upma", subtitle: "A Perfect Blend Of Flavors & Nutrition", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/fruit.png-zkxgWG2CoPWuSifvMhWWBgnIXsrdzw.png" },
  { id: 3, name: "Cashew Chicken", subtitle: "A Perfect Blend Of Flavors & Nutrition", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/drink.png-Bn98EV0Y9ho9LurBeWpUqNxRPM9o2p.png" },
  { id: 4, name: "Prawns Biryani", subtitle: "A Perfect Blend Of Flavors & Nutrition", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Burger.png-KL84dDVpks5I4G2XOUmLsuqHZq8eBz.png" },
  { id: 5, name: "Cashew Delight Upma", subtitle: "A Perfect Blend Of Flavors & Nutrition", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/drink.png-Bn98EV0Y9ho9LurBeWpUqNxRPM9o2p.png" },
  { id: 6, name: "Chicken Biryani", subtitle: "A Perfect Blend Of Flavors & Nutrition", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beef.png-2CUGA48h1jJI07o8jBTnyTXuCL8mHr.png" },
  { id: 7, name: "Panner Curry Rice", subtitle: "A Perfect Blend Of Flavors & Nutrition", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beef.png-2CUGA48h1jJI07o8jBTnyTXuCL8mHr.png" },
]

export default function Products() {
  const { scrollRef, scroll } = useScroll<HTMLDivElement>()
  const [isAutoScrollPaused, setIsAutoScrollPaused] = useState(false)

  useEffect(() => {
    if (isAutoScrollPaused) return
    const el = scrollRef.current
    if (!el) return

    const interval = window.setInterval(() => {
      const node = scrollRef.current
      if (!node) return

      const atEnd = node.scrollLeft + node.clientWidth >= node.scrollWidth - 8
      if (atEnd) {
        node.scrollTo({ left: 0, behavior: "smooth" })
      } else {
        node.scrollBy({ left: 260, behavior: "smooth" })
      }
    }, 2600)

    return () => window.clearInterval(interval)
  }, [isAutoScrollPaused, scrollRef])

  return (
    <section
        id="products"
        className="w-full min-h-screen bg-[#F97316] flex flex-col items-center py-10 overflow-hidden"
      >

        <div className="w-full px-4 sm:px-6 lg:px-8 flex flex-col items-strech">
        <h2 className="font-heading text-2xl md:text-3xl lg:text-4xl font-bold text-white text-center mb-6 md:mb-8 tracking-[0.5px]">
          OUR PRODUCTS
        </h2>
        <div className="relative flex items-center w-full">
          <button onClick={() => scroll("left")} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white rounded-full flex items-center justify-center transition-all duration-300 hover:-translate-y-1/2 hover:scale-105" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <svg className="w-4 h-4 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>


          <div
              ref={scrollRef}
              onMouseEnter={() => setIsAutoScrollPaused(true)}
              onMouseLeave={() => setIsAutoScrollPaused(false)}
              onFocusCapture={() => setIsAutoScrollPaused(true)}
              onBlurCapture={() => setIsAutoScrollPaused(false)}
              className="flex gap-6 overflow-x-auto scrollbar-hide px-6 md:px-10 xl:px-16 py-6 w-full mt-4 snap-x snap-mandatory"
            >
            {categories.map((category) => (
              <Link key={category.id} href={`/product/${category.name.toLowerCase().replace(/\s+/g, "-")}`} className="flex-shrink-0 group">
                <div className="
                  card-smooth bg-white rounded-full 
                  w-[140px] md:w-[180px] xl:w-[220px] 
                  h-[220px] md:h-[260px] xl:h-[300px] 
                  flex flex-col items-center pt-5 pb-5 px-4 
                  transition-all duration-300 ease-out
                  group-hover:shadow-lg group-hover:scale-[1.02]
                ">
                  <div className="w-[88px] h-[88px] md:w-[110px] md:h-[110px] overflow-hidden mb-3 flex-shrink-0">
                    <Image src={category.image} alt={category.name} width={110} height={110} className="w-full h-full object-contain" />
                  </div>
                  <h3 className="font-semibold text-[#5B2C2C] text-center text-[14px] md:text-[15px] leading-tight line-clamp-2 min-h-[36px] md:min-h-[40px] mb-1">
                    {category.name}
                  </h3>
                  <p className="text-[#8B8B8B] text-[11px] md:text-[12px] text-center leading-tight px-1 line-clamp-2 min-h-[32px] md:min-h-[36px]">
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

