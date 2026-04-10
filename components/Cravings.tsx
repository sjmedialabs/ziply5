import Link from "next/link"
import Image from "next/image"

const cravingsGallery = [
  { id: 1, title: "Comfort in 5 Mins", image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=400&fit=crop" },
  { id: 2, title: "Umami Mode", image: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=300&h=400&fit=crop" },
  { id: 3, title: "Green Out Here", image: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=300&h=400&fit=crop" },
  { id: 4, title: "Seafood Flex", image: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=300&h=400&fit=crop" },
  { id: 5, title: "Comfort in 5 Mins", image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300&h=400&fit=crop" },
  { id: 6, title: "Umami Mode", image: "https://images.unsplash.com/photo-1482049016gy899a9b4z?w=300&h=400&fit=crop" },
]

export default function Cravings() {
  return (
    <section className="bg-amber-50 py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between ">
          <h2 className="font-heading text-3xl md:text-4xl  font-extrabold text-zinc-900">FUEL YOUR CRAVINGS</h2>
          <Link href="https://instagram.com" target="_blank" className="flex items-center gap-2 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white px-4 py-2 rounded-full font-semibold text-sm hover:opacity-90 transition-opacity">FOLLOW @ZIPLY5</Link>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          {cravingsGallery.map((item) => (
            <div key={item.id} className="flex-shrink-0 w-48 md:w-56 group cursor-pointer">
              <div className="relative h-64 md:h-72 rounded-2xl overflow-hidden shadow-lg transform group-hover:scale-105 transition-transform duration-300">
                <Image src={item.image} alt={item.title} fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4"><p className="font-heading text-white font-bold text-lg">{item.title}</p></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}