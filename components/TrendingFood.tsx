"use client"

import Image from "next/image"
import SectionHeader from "./SectionHeader"

const trendingProducts = [
  { id: 1, name: "ZIPLY5 PLAIN WHITE RICE", subtitle: "loream ipsum dummy text", price: 299, originalPrice: 350, discount: "17% off", image: "assets/Homepage/plainWhiteRice.png", badge: null, gradient: "from-[#5B9BD5] to-[#3A7FC2]", featured: false },
  { id: 2, name: "SPCL DAL MAKHANI RICE", subtitle: "All Dressed Up", price: 349, originalPrice: 399, discount: "10% off", image: "assets/Homepage/dalMakhaniRice.png", badge: null, gradient: "from-[#A78BDA] to-[#8B6FC0]", featured: false },
  { id: 3, name: "ZIPLY5 SPCL VEG RICE", subtitle: "Jalapeo Cheddar Blaze", price: 229, originalPrice: 290, discount: "5% off", image: "assets/Homepage/specialVegRice.png", badge: null, gradient: "from-[#8BC34A] to-[#689F38]", featured: true },
  { id: 4, name: "ZIPLY5 PONGAL", subtitle: "Rockin' Ranch", price: 279, originalPrice: 329, discount: "12% off", image: "assets/Homepage/pongal.png", badge: null, gradient: "from-[#4A90D9] to-[#2E6EB5]", featured: false },
]
import { useEffect, useState } from "react";

function useIsLg() {
  const [isLg, setIsLg] = useState(false);

  useEffect(() => {
    const check = () => {
      setIsLg(window.innerWidth >= 1024 && window.innerWidth < 1280);
    };

    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return isLg;
}
export default function TrendingFood() {
  const isLg = useIsLg();

const visibleProducts = isLg
  ? trendingProducts.slice(0, 3) // 👈 only 3 on lg
  : trendingProducts;
  return (
    <section id="trending" className="bg-[#F3F4F6] py-12 md:py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4">
        <SectionHeader title="FOOD THAT'S TRENDING" linkHref="/#trending" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 justify-items-center">
          {visibleProducts.map((product) => (
            <div
              key={product.id}
              className="w-full max-w-sm h-90 group bg-white rounded-[16px] overflow-hidden 
              transition-all duration-300 
              shadow-[0_10px_25px_rgba(0,0,0,0.08)] 
              hover:shadow-[0_15px_35px_rgba(0,0,0,0.12)]
              hover:ring-2 hover:ring-[#EF4444]"
            >
              {/* FLEX CONTAINER */}
              <div className="flex flex-col h-full">

                {/* IMAGE SECTION */}
                <div
                  className={`relative bg-gradient-to-b ${product.gradient} 
                  flex items-center justify-center 
                  transition-all duration-300 
                  h-full group-hover:h-[65%]`}
                >
                  {/* veg icon */}
                  <div className="absolute top-3 z-20 right-3 w-5 h-5 bg-white rounded-sm flex items-center justify-center">
                    <div className="w-3 h-3 border-2 border-green-600 rounded-sm flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                    </div>
                  </div>
                  <div
                    className={`relative w-full h-full flex items-center justify-center `}
                  >
                    <Image
                      src={`/${product.image}`}
                      alt={product.name}
                      fill
                      className="h-full w-auto p-0"
                    />
                  </div>
                </div>

                {/* CONTENT SECTION */}
                <div className="flex flex-col px-4 py-4">
                <div className="flex flex-row justify-between items-center">

                  <div>
                    {/* TITLE */}
                    <h3 className="font-bold uppercase text-primary text-[14px] mb-1 truncate">
                      {product.name}
                    </h3>

                    {/* SUBTITLE */}
                    <p
                      className={`text-[12px] font-semibold capitalize truncate bg-gradient-to-r ${product.gradient} bg-clip-text text-transparent`}
                    >
                      {product.subtitle}
                    </p>
                  </div>
                  <div>
                    {/* BUTTON */}
                    <button
                      onClick={(e) => e.preventDefault()}
                      className="border-2 border-[#EF4444] 
        px-3 py-1 rounded-lg text-[12px] font-semibold 
        hover:bg-[#EF4444] hover:text-white transition-colors"
                    >
                      ADD
                    </button></div>
                </div>
                                    {/* PRICE (hidden → reveal) */}
                    <div
                      className="mt-2 hidden translate-y-2 flex-col 
          group-hover:flex group-hover:translate-y-0 
          transition-all duration-300"
                    >
                      {product.originalPrice && (
                        <span className="text-[#9CA3AF] text-[11px] block">
                          Rs. {product.originalPrice}
                        </span>
                      )}

                      <span className="font-bold text-[#F97316] text-[16px]">
                        Rs. {product.price}
                      </span>

                      {product.discount && (
                        <span className="text-green-600 text-[10px] font-medium block">
                          {product.discount}
                        </span>
                      )}
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