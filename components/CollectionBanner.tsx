import Image from "next/image"

export default function CollectionBanner() {
  return (
    <section className="bg-cyan-400 py-12 md:py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-12 items-center justify-items-center">
          <div className="relative w-full max-w-lg">
            <div className="bg-cyan-300 rounded-3xl p-6 md:p-8 relative overflow-hidden">
              <span className="absolute top-4 left-4 bg-red-500 text-white font-bold px-4 py-2 rounded-full text-sm transform -rotate-12">NEW</span>
              <div className="flex justify-center">
                <div className="relative w-64 h-64 md:w-80 md:h-80">
                  <Image src="https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&h=400&fit=crop" alt="Special Veg Rice" fill className="object-cover rounded-full shadow-2xl" />
                </div>
              </div>
              <div className="absolute bottom-6 left-6 bg-white rounded-xl p-3 shadow-lg">
                <p className="font-heading text-orange-500 font-bold text-xs">ZIPLY5</p>
                <p className="font-heading text-zinc-900 font-extrabold">SPECIAL</p>
                <p className="font-heading text-green-600 font-extrabold">VEG RICE</p>
              </div>
            </div>
          </div>
          <div className="text-center lg:text-left flex flex-col items-center lg:items-start">
            <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl font-extrabold text-zinc-900 mb-4">
              OUR VEG<br />NON VEG<br />COLLECTION
            </h2>
            <div className="bg-yellow-400 rounded-3xl p-6 inline-block mt-4">
              <p className="font-heading text-zinc-900 font-bold text-sm mb-2">HOMESTYLE FOOD,</p>
              <p className="font-heading text-zinc-900 font-bold text-sm mb-4">INSTANT IN YOUR PLATE</p>
              <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                <div className="relative w-20 h-20"><Image src="https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=100&h=100&fit=crop" alt="Chicken Biryani" fill className="object-cover rounded-lg" /></div>
                <div><p className="font-heading text-orange-600 font-extrabold">CHICKEN</p><p className="font-heading text-orange-600 font-extrabold">BIRYANI</p></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}