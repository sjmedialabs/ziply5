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

export default function CravingsGallery({ cmsData }: { cmsData?: any }) {
  const displayItems = cmsData?.items?.length > 0 ? cmsData.items : cravingsGallery;
  const sectionTitle = cmsData?.title || "FUEL YOUR CRAVINGS";
  const buttonText = cmsData?.buttonText || "Follow@ziply5";
  const buttonUrl = cmsData?.url || "#";

  return (
    <section className="bg-[#fff]">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-start justify-center sm:justify-between gap-2 sm:gap-4 mb-4">
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold text-primary text-center sm:text-left">
            {sectionTitle}
          </h2>
          <Link href={buttonUrl}>
            <Button className="bg-primary text-[#fff] h-[40px] rounded-[10px] font-bold cursor-pointer 
                border-2 border-transparent 
                hover:border-[#F36E21] 
                transition-all duration-300 ease-in-out mb-2 sm:mb-0">
              {buttonText}
            </Button>
          </Link>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          {displayItems.map((item: any, i: number) => (
            <div key={item.id || i} className="flex-shrink-0 w-48 md:w-56 group py-2 h-full">
              <div className="card-smooth relative h-64 md:h-80 shadow-lg rounded-lg group-hover:scale-[1.02]">
                <Image src={item.image} alt={item.alt || `craving ${item.id || i}`} fill className="object-cover rounded-lg" />
                <div className="absolute inset-0 bg-gradient-to-t rounded-lg from-black/60 to-transparent" />
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