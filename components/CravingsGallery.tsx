import Image from "next/image"
import Link from "next/link"
import { Button } from "./ui/button"

const cravingsGallery = [
  { id: 1, image: "/craving1.png" },
  { id: 2, image: "/craving2.png" },
  { id: 3, image: "/craving3.png" },
  { id: 4, image: "/craving4.png" },
  { id: 5, image: "/craving5.png" },
  { id: 6, image: "/craving6.png" },
]

export default function CravingsGallery() {
  return (
    <section className="bg-[#fff]">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-start justify-center sm:justify-between gap-2 sm:gap-4 mb-4">
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold text-primary text-center sm:text-left">FUEL YOUR CRAVINGS</h2>
          <Button className="bg-primary text-[#fff] h-[40px] rounded-[10px] font-bold cursor-pointer 
              border-2 border-transparent 
              hover:border-[#F36E21] 
              transition-all duration-300 ease-in-out mb-2 sm:mb-0">
            Follow@ziply5
          </Button>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          {cravingsGallery.map((item) => (
            <div key={item.id} className="flex-shrink-0 w-48 md:w-56 group cursor-pointer">
              <div className="relative h-64 md:h-80  overflow-hidden shadow-lg transform group-hover:scale-105 transition-transform duration-300">
                <Image src={item.image} alt={`craving ${item.id}`} fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                {/* <div className="absolute bottom-4 left-4 right-4">
                  <p className="font-heading text-white font-bold text-lg">{item.title}</p>
                </div> */}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}