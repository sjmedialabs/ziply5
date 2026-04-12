"use client"

import { useState, useEffect } from "react"
import Image from "next/image"

export default function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [startX, setStartX] = useState(0)
  const [endX, setEndX] = useState(0)

  const slides = [
    "/hero-banner.png",
    "/hero2.png",
    "/hero3.png",
  ]

  const handleTouchStart = (e: any) => {
  setStartX(e.targetTouches[0].clientX)
}

const handleTouchMove = (e: any) => {
  e.preventDefault()
  setEndX(e.targetTouches[0].clientX)
}

const handleTouchEnd = () => {
  const delta = startX - endX
  if (delta > 75) {
    // swipe left
    setCurrentSlide((prev) => (prev + 1) % slides.length)
  } else if (delta < -75) {
    // swipe right
    setCurrentSlide((prev) => prev === 0 ? slides.length - 1 : prev - 1)
  }
}

  useEffect(() => {
    let rafId: number
    let nextSlideTime = Date.now() + 4000
    let isPaused = false

    const tick = () => {
      const now = Date.now()
      if (!isPaused && now >= nextSlideTime) {
        setCurrentSlide((prev) => (prev + 1) % slides.length)
        nextSlideTime = now + 4000
      }
      rafId = requestAnimationFrame(tick)
    }

    const handleVisibility = () => {
      isPaused = document.hidden
    }

    rafId = requestAnimationFrame(tick)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  return (
    <section className="relative overflow-hidden">
      <div
        className="relative h-[450px] md:h-[550px] lg:h-[620px] w-full touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchMoveCapture={(e) => handleTouchMove(e as any)}
      >
        
        <Image
          src={slides[currentSlide]}
          alt="Hero Image"
          fill
          sizes="100vw"
          className="object-cover w-full h-full"
          priority
        />

        <div className="absolute inset-0 flex items-start mt-15">
          <div className="w-full max-w-7xl mx-auto px-4">
            <div className="max-w-7xl">
              <h1 className="font-heading text-3xl md:text-5xl lg:text-7xl font-extrabold text-primary leading-[1.05] mb-4 whitespace-nowrap">
                Nothing Artificial.<br />Everything Delicious.
              </h1>
              <p
              className="font-heading text-lg md:text-2xl lg:text-4xl font-extrabold text-primary  leading-[1.05] mb-4 whitespace-nowrap"
                // className="text-base md:text-lg lg:text-xl text-amber-100 font-semibold uppercase tracking-wide max-w-md italic"
                style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.3)" }}
              >
                TASTE THE AUTHENTIC FLAVORS<br />OF HOME-COOKED MEALS!
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
            className={`h-2.5 rounded-full cursor-pointer transition-all duration-300 ${
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