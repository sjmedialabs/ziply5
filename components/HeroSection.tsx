"use client"

import { useState } from "react"
import Image from "next/image"

export default function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0)

  return (
    <section className="relative overflow-hidden">
      <div className="relative min-h-[450px] md:min-h-[550px] lg:min-h-[620px]">
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/hero%20banner-CDaQZeTiFLqC26eXZYmjH9CGeO5Ob4.png"
          alt="Ziply5 Special Veg Rice"
          fill
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="max-w-xl mx-auto md:mx-0 text-center md:text-left">
              <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold text-amber-900 leading-[1.1] mb-4 italic drop-shadow-md">
                Nothing Artificial.<br />Everything Delicious.
              </h1>
              <p className="text-base md:text-lg lg:text-xl text-amber-100 font-semibold uppercase tracking-wide max-w-md mx-auto md:mx-0 italic" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}>
                Taste the authentic flavors<br />of home-cooked meals!
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
        {[0, 1, 2].map((dot) => (
          <button key={dot} onClick={() => setCurrentSlide(dot)} className={`w-2.5 h-2.5 rounded-full transition-all border-2 border-amber-900/50 ${currentSlide === dot ? "bg-amber-900 w-6" : "bg-white/80"}`} />
        ))}
      </div>
    </section>
  )
}