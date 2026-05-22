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

  useEffect(() => {
    let rafId: number
    let nextSlideTime = Date.now() + 5000
    let isPaused = false

    const tick = () => {
      const now = Date.now()
      if (!isPaused && now >= nextSlideTime) {
        setCurrentSlide((prev) => (prev + 1) % slides.length)
        nextSlideTime = now + 5000
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
  }, [slides.length])

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
          {slides.map((slide: any, idx: number) => {
            const isActive = currentSlide === idx;

            return (
              <m.div
                key={idx}
                className="absolute inset-0 h-full w-full pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: isActive ? 1 : 0 }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
                style={{ zIndex: isActive ? 10 : 0 }}
              >
                {slide?.mobileImage ? (
                  <>
                    <Image
                      src={slide.mobileImage}
                      alt={slide?.alt || `Hero Image ${idx} Mobile`}
                      fill
                      sizes="100vw"
                      className="object-cover w-full h-full block md:hidden"
                      priority={idx === 0}
                    />
                    <Image
                      src={slide?.image || slide}
                      alt={slide?.alt || `Hero Image ${idx}`}
                      fill
                      sizes="100vw"
                      className="object-cover w-full h-full hidden md:block"
                      priority={idx === 0}
                    />
                  </>
                ) : (
                  <Image
                    src={slide?.image || slide}
                    alt={slide?.alt || `Hero Image ${idx}`}
                    fill
                    sizes="100vw"
                    className="object-cover w-full h-full"
                    priority={idx === 0}
                  />
                )}
              </m.div>
            );
          })}

          {/* TEXT OVERLAY (Re-mounts on slide change to trigger SplitText) */}
          <div className="absolute inset-0 z-20 flex items-start -mt-10 md:pt-40 lg:pt-1 pointer-events-none">
            <div className="w-full max-w-7xl mx-auto px-4 relative h-full">
              <m.div
                key={`text-${currentSlide}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 1 }}
                className="max-w-7xl pt-24 md:pt-20"
              >
                <h1 className="font-heading text-3xl md:text-5xl lg:text-7xl font-extrabold text-primary leading-[1.05] drop-shadow-lg">
                  <SplitText
                    text={(() => {
                      const title = currentTitle;
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
                <div className="mt-1 md:mt-4">
                  <p className="font-heading text-md md:text-2xl lg:text-4xl font-extrabold leading-snug text-primary uppercase drop-shadow-md whitespace-pre-line">
                    <SplitText
                      text={(() => {
                        const subtitle = currentSubtitle;
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
