"use client"

import { useState, useEffect, useMemo } from "react"
import Image from "next/image"
import { m, useReducedMotion } from "framer-motion"
import SplitText from "./animations/SplitText"



export default function Hero({ cmsData }: { cmsData?: any }) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [startX, setStartX] = useState(0)
  const [endX, setEndX] = useState(0)
  const reduceMotion = useReducedMotion()

  const defaultSlides = [
    { image: "/hero-banner.png", alt: "Hero Image" },
    { image: "/hero-banner.png", alt: "Hero Image" },
    { image: "/hero-banner.png", alt: "Hero Image" },
  ]

  const slides = cmsData?.slides?.length > 0 ? cmsData.slides : defaultSlides
  const globalTitle = cmsData?.title || "Nothing Artificial.\nEverything Delicious."
  const globalSubtitle = cmsData?.subtitle || "TASTE THE AUTHENTIC FLAVORS\nOF HOME-COOKED MEALS!"

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault()
    setEndX(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    const delta = startX - endX
    if (delta > 75) {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    } else if (delta < -75) {
      setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1))
    }
  }

  const extendedSlides = useMemo(() => {
    if (slides.length <= 1) return slides
    return [...slides, slides[0]]
  }, [slides])

  const [isWarping, setIsWarping] = useState(false)

  useEffect(() => {
    let rafId: number
    let nextSlideTime = Date.now() + 4000
    let isPaused = false

    const tick = () => {
      const now = Date.now()
      if (!isPaused && now >= nextSlideTime) {
        setCurrentSlide((prev) => {
          const next = prev + 1
          if (next >= extendedSlides.length) {
            // This case shouldn't happen with the warping logic but safety first
            return 0
          }
          return next
        })
        nextSlideTime = now + 4000
      }
      rafId = requestAnimationFrame(tick)
    }

    const handleVisibility = () => {
      isPaused = document.hidden
    }

    rafId = requestAnimationFrame(tick)
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [extendedSlides.length])

  // Warping Logic: When we hit the last (cloned) slide, warp back to 0
  useEffect(() => {
    if (currentSlide === extendedSlides.length - 1) {
      const timer = setTimeout(() => {
        setIsWarping(true)
        setCurrentSlide(0)
        // Reset warping state after the warp happens
        setTimeout(() => setIsWarping(false), 50)
      }, 3500) // Wait for the transition to finish (matching the 3.5s duration)
      return () => clearTimeout(timer)
    }
  }, [currentSlide, extendedSlides.length])

  const currentTitle = slides[currentSlide % slides.length]?.title || globalTitle
  const currentSubtitle = slides[currentSlide % slides.length]?.subtitle || globalSubtitle



  return (
    <section className="relative overflow-hidden">
      <div
        className="relative h-[450px] md:h-[550px] lg:h-[620px] w-full touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="relative h-full w-full overflow-hidden">
          <m.div
            className="flex h-full w-full"
            animate={{ x: `-${currentSlide * 100}%` }}
            transition={isWarping ? { duration: 0 } : { duration: 2.5, ease: [0.32, 0.72, 0, 1] }}
          >
            {extendedSlides.map((slide: any, idx: number) => {
              const slideTitle = slide?.title || globalTitle;
              const slideSubtitle = slide?.subtitle || globalSubtitle;

              return (
                <div key={idx} className="h-full w-full flex-shrink-0 relative">
                  <Image
                    src={slide?.image || slide}
                    alt={slide?.alt || `Hero Image ${idx}`}
                    fill
                    sizes="100vw"
                    className="object-cover w-full h-full"
                    priority={idx === 0}
                  />

                  {/* TEXT SLIDING WITH IMAGE */}
                  <div className="absolute inset-0 z-20 flex items-start pt-32 md:pt-40 lg:pt-1 pointer-events-none">
                    <div className="w-full max-w-7xl mx-auto px-4 relative h-full">
                      <m.div
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: currentSlide === idx ? 1 : 0, x: currentSlide === idx ? 0 : 50 }}
                        transition={isWarping ? { duration: 0 } : { delay: 0.2, duration: 1.8 }}
                        className="max-w-7xl pt-24 md:pt-20"
                      >
                        <h1 className="font-heading text-3xl md:text-5xl lg:text-7xl font-extrabold text-primary leading-[1.05] drop-shadow-lg">
                          <SplitText
                            text={(() => {
                              const title = slideTitle;
                              if (title.includes("\n")) return title;
                              const words = title.trim().split(/\s+/);
                              if (words.length > 3) {
                                return `${words.slice(0, 2).join(" ")}\n${words.slice(2).join(" ")}`;
                              }
                              return title;
                            })()}
                            stagger={0.03}
                          />
                        </h1>
                        <div className="mt-4">
                          <p className="font-heading text-lg md:text-2xl lg:text-4xl font-extrabold leading-snug text-primary uppercase drop-shadow-md whitespace-pre-line">
                            <SplitText
                              text={(() => {
                                const subtitle = slideSubtitle;
                                if (subtitle.includes("\n")) return subtitle;
                                const words = subtitle.trim().split(/\s+/);
                                if (words.length > 3) {
                                  return `${words.slice(0, 6).join(" ")}\n${words.slice(6).join(" ")}`;
                                }
                                return subtitle;
                              })()}
                              stagger={0.02}
                            />
                          </p>
                        </div>
                      </m.div>
                    </div>
                  </div>
                </div>
              );
            })}
          </m.div>
        </div>


      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_: any, dot: number) => (
          <button
            key={dot}
            type="button"
            aria-label={`Slide ${dot + 1}`}
            onClick={() => {
              setIsWarping(false)
              setCurrentSlide(dot)
            }}
            className={`h-2.5 rounded-full cursor-pointer transition-all duration-300 ${currentSlide % slides.length === dot
              ? "w-6 bg-amber-900"
              : "w-2.5 bg-white/80 border border-amber-900/50"
              }`}
          />
        ))}
      </div>
    </section>
  )
}
