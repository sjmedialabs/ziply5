"use client"

import Image from "next/image"
import SectionHeader from "./SectionHeader"

const bestSellers = [
  { id: 1, name: "SPCL DAL MAKHANI RICE", subtitle: "LOREM IPSUM IS SIMPLE DUMMY TEXT", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Ziply5%20-%20Pouch%20-%20Mushroom%20Curry%20Rice%201-HXqEHZCMyWWV2BNnZyH0ab0PBduJG7.png", bgColor: "#8B7355", isNonVeg: true, showAddBtn: true },
  { id: 2, name: "MANCHBOOS PRAWN RICE", subtitle: "LOREM IPSUM IS SIMPLE DUMMY TEXT", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Ziply5%20-%20Pouch%20-%20Machboos%20Prawn%20Rice%201-myZMnhQwIEX56xNVKHM0oNhZuB0Drz.png", bgColor: "#7B68A6", isNonVeg: true, showAddBtn: false },
  { id: 3, name: "MANCHBOOS CHICKEN RICE", subtitle: "LOREM IPSUM IS SIMPLE DUMMY TEXT", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Ziply5%20-%20Pouch%20-%20Machboos%20Chk%20Rice%201-UCe2aa7Dd0MLeBrrglhnoDuDFxkd91.png", bgColor: "#2B7A78", isNonVeg: true, showAddBtn: false },
  { id: 4, name: "MANCHBOOS PRAWN RICE", subtitle: "LOREM IPSUM IS SIMPLE DUMMY TEXT", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Ziply5%20-%20Pouch%20-%20Kaju%20Chk%20Curry%20Rice%201-i8wGwe88fBPNeexVcy6IIVzEIy4K46.png", bgColor: "#4A7C4E", isNonVeg: true, showAddBtn: false },
  { id: 5, name: "MANCHBOOS PRAWN RICE", subtitle: "LOREM IPSUM IS SIMPLE DUMMY TEXT", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Ziply5%20-%20Pouch%20-%20Palak%20Chk%20Rice%201-P88GAbA7CEe7gxdVDNdd6Y5qNi2KVi.png", bgColor: "#2B8B8B", isNonVeg: true, showAddBtn: false },
  { id: 6, name: "MANCHBOOS CHICKEN RICE", subtitle: "LOREM IPSUM IS SIMPLE DUMMY TEXT", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Ziply5%20-%20Pouch%20-%20Dal%20Rice%201-Yve5sxlshAZEd6IgCqqnyO5knMJjyH.png", bgColor: "#A64B7B", isNonVeg: true, showAddBtn: false },
]

export default function BestSellers() {
  return (
    <section id="best-sellers" className="bg-[#F5F0E1] py-12 md:py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader title="BEST SELLERS" linkHref="/#best-sellers" />
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 justify-items-center">
          {bestSellers.map((product) => (
            <div key={product.id} className="w-full max-w-sm group cursor-pointer">
              <div className="rounded-[20px] p-5 relative overflow-hidden transition-all duration-300 group-hover:-translate-y-2 group-hover:shadow-xl h-[320px] md:h-[360px] flex flex-col" style={{ backgroundColor: product.bgColor }}>
                {product.isNonVeg && (
                  <span className="absolute top-4 right-4 bg-[#F97316] text-white text-[11px] font-semibold px-3 py-1 rounded-full z-10">Non-veg</span>
                )}
                <div className="flex-1 flex items-center justify-center py-4">
                  <Image src={product.image} alt={product.name} width={180} height={220} className="w-auto h-[180px] md:h-[200px] object-contain drop-shadow-lg group-hover:scale-105 transition-transform duration-300" />
                </div>
                <div className="mt-auto text-center pb-2">
                  <h3 className="font-semibold text-white text-[15px] md:text-[16px] leading-tight mb-1 tracking-wide">
                    {product.name}
                  </h3>
                  <p className="text-white/70 text-[11px] md:text-[12px] uppercase tracking-wide">
                    {product.subtitle}
                  </p>
                  {product.showAddBtn && (
                    <button onClick={(e) => e.stopPropagation()} className="mt-4 w-full bg-[#4A1D1F] text-white py-2.5 rounded-full text-[13px] font-semibold hover:bg-[#3a1517] transition-colors">ADD</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}