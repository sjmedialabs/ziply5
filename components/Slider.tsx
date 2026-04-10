"use client"

import { useState, useEffect } from "react"
import Image from "next/image"

interface SliderProps {
  slides: string[]
  autoPlay?: boolean
  interval?: number
}

export default function Slider({
  slides,
  autoPlay = true,
  interval = 4000,
}: SliderProps) {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (!autoPlay) return
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length)
    }, interval)
    return () => clearInterval(timer)
  }, [slides.length, autoPlay, interval])

  return (
    <div className="relative w-full h-full overflow-hidden">
      
      {/* Slides */}
      <div className="relative w-full h-full">
        {slides.map((img, index) => (
          <Image
            key={index}
            src={img}
            alt={`Slide ${index}`}
            fill
            priority={index === 0}
            className={`object-cover transition-opacity duration-700 ${
              index === current ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
      </div>

      {/* Dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-2.5 rounded-full transition-all duration-300 ${
              current === i
                ? "w-6 bg-[#7a1e0e]"
                : "w-2.5 bg-white/80 border border-[#7a1e0e]/40"
            }`}
          />
        ))}
      </div>
    </div>
  )
}