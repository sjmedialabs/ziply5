"use client"

import Image from "next/image"
import SectionHeader from "./SectionHeader"

const bestSellers = [
  { id: 1, name: "SPCL DAL MAKHANI RICE", subtitle: "LOREM IPSUM IS SIMPLE DUMMY TEXT", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Ziply5%20-%20Pouch%20-%20Mushroom%20Curry%20Rice%201-HXqEHZCMyWWV2BNnZyH0ab0PBduJG7.png", bgColor: "#8B7355", isNonVeg: true, showAddBtn: true },
  { id: 2, name: "MANCHBOOS PRAWN RICE", subtitle: "LOREM IPSUM IS SIMPLE DUMMY TEXT", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Ziply5%20-%20Pouch%20-%20Machboos%20Prawn%20Rice%201-myZMnhQwIEX56xNVKHM0oNhZuB0Drz.png", bgColor: "#7B68A6", isNonVeg: true, showAddBtn: false },
  { id: 3, name: "MANCHBOOS CHICKEN RICE", subtitle: "LOREM IPSUM IS SIMPLE DUMMY TEXT", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Ziply5%20-%20Pouch%20-%20Machboos%20Chk%20Rice%201-UCe2aa7Dd0MLeBrrglhnoDuDFxkd91.png", bgColor: "#2B7A78", isNonVeg: true, showAddBtn: false },
  { id: 4, name: "MANCHBOOS PRAWN RICE", subtitle: "LOREM IPSUM IS SIMPLE DUMMY TEXT", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Ziply5%20-%20Pouch%20-%20Kaju%20Chk%20Curry%20Rice%201-i8wGwe88fBPNeexVcy6IIVzEIy4K46.png", bgColor: "#4A7C4E", isNonVeg: true, showAddBtn: false },
  { id: 5, name: "MANCHBOOS PRAWN RICE", subtitle: "LOREM IPSUM IS SIMPLE DUMMY TEXT", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Ziply5%20-%20Pouch%20-%20Palak%20Chk%20Rice%201-P88GAbA7CEe7gxdVDNdd6Y5qNi2KVi.png", bgColor: "#2B8B8B", isNonVeg: true, showAddBtn: false },
  { id: 6, name: "MANCHBOOS CHICKEN RICE", subtitle: "LOREM IPSUM IS SIMPLE DUMMY TEXT", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Ziply5%20-%20Pouch%20-%20Dal%20Rice%201-Yve5sxlshAZEd6IgCqqnyO5knMJjyH.png", bgColor: "#A64B7B", isNonVeg: false, showAddBtn: false },
]

export default function BestSellers() {
  return (
    <section id="best-sellers" className="bg-[#F5F0E1] py-12 md:py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader title="BEST SELLERS" linkHref="/#best-sellers" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 justify-items-center">
          {bestSellers.map((product) => (
            <div key={product.id} className="w-full max-w-sm group cursor-pointer font-melon">
              <div className="rounded-2xl px-8  relative overflow-hidden transition-all duration-300 group-hover:ring-4 group-hover:ring-[#F36E21] group-hover:shadow-xl h-full flex flex-col" style={{ backgroundColor: product.bgColor }}>
                {product.isNonVeg && (
                  <span className="absolute top-4 right-0 bg-[#F97316] text-white text-[11px] font-medium px-3 py-1 rounded-l-sm border border-white z-10">Non-veg</span>
                )}
                {!product.isNonVeg && (
                  <span className="absolute top-4 right-0 bg-[#10B981] text-white text-[11px] font-medium px-3 py-1 border border-white rounded-l-sm z-10">Pure-Veg</span>
                )}
                <div className="relative h-full flex items-center justify-center py-4">
                  <Image src={product.image} alt={product.name} width={180} height={220} className="w-auto h-full object-contain drop-shadow-lg group-hover:scale-105 transition-transform duration-300" />
                </div>
                <div className="text-center ">
                  <h3 className="font-medium text-white text-[15px] md:text-xl leading-tight tracking-wide">
                    {product.name}
                  </h3>
                  <p className="text-[#FFF5C5]  text-[11px]  uppercase tracking-wide">
                    {product.subtitle}
                  </p>

                  <div className="mt-2 mb-4 overflow-hidden group-hover:overflow-visible transition-all
                  max-h-0 group-hover:max-h-[61px] duration-500 ease-out">

                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="w-full border border-white text-white py-2.5 rounded-lg text-[13px] font-medium
                      opacity-0 translate-y-3 
                      group-hover:opacity-100 group-hover:-translate-y-0 
                      transition-all duration-300 hover:bg-[#3a1517]"
                    >
                      ADD
                    </button>

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