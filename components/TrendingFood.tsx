"use client"

import Image from "next/image"
import SectionHeader from "./SectionHeader"

const trendingProducts = [
  { id: 1, name: "ZIPLY5 PLAIN WHITE RICE", subtitle: "loream ipsum dummy text", price: 299, originalPrice: null, image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image%2069-Wad13TxQUuVaYNy0jtfCIdXuusTAP5.png", badge: null, gradient: "from-[#5B9BD5] to-[#3A7FC2]", featured: false },
  { id: 2, name: "SPCL DAL MAKHANI RICE", subtitle: "All Dressed Up", price: 349, originalPrice: null, image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image%2069-Wad13TxQUuVaYNy0jtfCIdXuusTAP5.png", badge: null, gradient: "from-[#A78BDA] to-[#8B6FC0]", featured: false },
  { id: 3, name: "ZIPLY5 SPCL VEG RICE", subtitle: "Jalapeo Cheddar Blaze", price: 229, originalPrice: 290, discount: "5% off", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image%2069-Wad13TxQUuVaYNy0jtfCIdXuusTAP5.png", badge: null, gradient: "from-[#8BC34A] to-[#689F38]", featured: true },
  { id: 4, name: "ZIPLY5 PONGAL", subtitle: "Rockin' Ranch", price: 279, originalPrice: null, image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image%2069-Wad13TxQUuVaYNy0jtfCIdXuusTAP5.png", badge: null, gradient: "from-[#4A90D9] to-[#2E6EB5]", featured: false },
]

export default function TrendingFood() {
  return (
    <section id="trending" className="bg-[#F3F4F6] py-12 md:py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader title="FOOD THAT'S TRENDING" linkHref="/#trending" />
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 justify-items-center">
          {trendingProducts.map((product) => (
            <div key={product.id} className={`w-full max-w-sm group bg-white rounded-[16px] overflow-hidden transition-all duration-300 hover:-translate-y-1.5 ${product.featured ? 'ring-2 ring-[#EF4444] shadow-lg' : 'shadow-[0_10px_25px_rgba(0,0,0,0.08)]'} hover:shadow-[0_15px_35px_rgba(0,0,0,0.12)]`}>
              <div className={`relative h-[180px] bg-gradient-to-b ${product.gradient} rounded-t-[16px] flex items-center justify-center`}>
                <div className="absolute top-3 right-3 w-5 h-5 bg-white rounded-sm flex items-center justify-center">
                  <div className="w-3 h-3 border-2 border-green-600 rounded-sm flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                  </div>
                </div>
                <Image src={product.image} alt={product.name} width={120} height={140} className="w-[100px] md:w-[120px] h-auto object-contain drop-shadow-lg group-hover:scale-105 transition-transform duration-300" />
              </div>
              <div className="p-[14px] flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-[#4A1D1F] text-[14px] leading-tight mb-1 truncate">
                      {product.name}
                    </h3>
                    <p className="text-[#6B7280] text-[12px] mb-1.5 truncate">
                      {product.subtitle}
                    </p>
                    {product.originalPrice ? (
                      <div className="flex flex-col">
                        <span className="text-[#9CA3AF] line-through text-[11px]">Rs. {product.originalPrice}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[#F97316] text-[16px]">Rs. {product.price}</span>
                          {product.discount && <span className="text-green-600 text-[10px] font-medium">{product.discount}</span>}
                        </div>
                      </div>
                    ) : (
                      <span className="text-[#6B7280] text-[12px]">{product.subtitle}</span>
                    )}
                  </div>
                  <button onClick={(e) => e.preventDefault()} className="flex-shrink-0 border border-[#EF4444] text-[#EF4444] bg-transparent px-3 py-1 rounded-full text-[12px] font-semibold hover:bg-[#EF4444] hover:text-white transition-colors self-end">ADD</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}