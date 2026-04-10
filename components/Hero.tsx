"use client"

import { useState, useEffect } from "react"
import Image from "next/image"

export default function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0)

  const slides = [
    "/hero-banner.png",
    "/hero2.png",
    "/hero3.png",
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 4000)

    return () => clearInterval(interval)
  }, [])

  return (
    <section className="relative overflow-hidden">
      <div className="relative min-h-[450px] md:min-h-[550px] lg:min-h-[620px]">
        
        <Image
          src={slides[currentSlide]}
          alt="Hero Image"
          fill
          className="object-cover transition-opacity duration-700"
          priority
        />

        <div className="absolute inset-0 flex items-start mt-15">
          <div className="w-full max-w-7xl mx-auto px-0">
            <div className="max-w-7xl">
              <h1 className="font-heading text-4xl md:text-7xl font-extrabold text-primary leading-[1.05] mb-4 whitespace-nowrap">
                Nothing Artificial.<br />Everything Delicious.
              </h1>
              <p
              className="font-heading text-4xl md:text-5xl font-extrabold uppercase text-primary leading-[1.05] mb-3 whitespace-nowrap"
                // className="text-base md:text-lg lg:text-xl text-amber-100 font-semibold uppercase tracking-wide max-w-md italic"
                style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.3)" }}
              >
                Taste the authentic flavors<br />of home-cooked meals!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* DOTS */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_, dot) => (
          <button
            key={dot}
            onClick={() => setCurrentSlide(dot)}
            className={`h-2.5 rounded-full transition-all duration-300 ${
              currentSlide === dot
                ? "w-6 bg-amber-900"
                : "w-2.5 bg-white/80 border border-amber-900/50"
            }`}
          />
        ))}
      </div>
    </section>
  )
}