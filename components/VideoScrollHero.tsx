"use client"

import { useEffect, useRef, useState, useMemo } from "react"
import { m, useScroll, useSpring, useTransform, useMotionValueEvent, AnimatePresence } from "framer-motion"

interface VideoScrollHeroProps {
  videoUrl: string
  cmsData?: any
}

export default function VideoScrollHero({ videoUrl, cmsData }: VideoScrollHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [images, setImages] = useState<HTMLImageElement[]>([])
  const [isExtracting, setIsExtracting] = useState(true)
  const [extractProgress, setExtractProgress] = useState(0)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isWarping, setIsWarping] = useState(false)

  // Carousel Logic for Loading State
  const slides = useMemo(() => {
    return cmsData?.slides?.length > 0 ? cmsData.slides : ["https://hebbkx1anhila5yf.public.blob.vercel-storage.com/hero%20banner-CDaQZeTiFLqC26eXZYmjH9CGeO5Ob4.png"]
  }, [cmsData])

  const extendedSlides = useMemo(() => {
    if (slides.length <= 1) return slides
    return [...slides, slides[0]]
  }, [slides])

  useEffect(() => {
    if (!isExtracting) return
    const timer = setInterval(() => {
      setCurrentSlide((prev) => prev + 1)
    }, 4000)
    return () => clearInterval(timer)
  }, [isExtracting, slides.length])

  // Warping Logic: When we hit the last (cloned) slide, warp back to 0
  useEffect(() => {
    if (currentSlide === extendedSlides.length - 1) {
      const timer = setTimeout(() => {
        setIsWarping(true)
        setCurrentSlide(0)
        setTimeout(() => setIsWarping(false), 50)
      }, 850) // Wait for the transition to finish
      return () => clearTimeout(timer)
    }
  }, [currentSlide, extendedSlides.length])

  const frameCount = 60

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  })

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  })

  useEffect(() => {
    if (!videoUrl) {
      console.warn("VideoScrollHero: No videoUrl provided. Hiding loader.");
      setIsExtracting(false);
      return;
    }
    const extract = async () => {
      // 1. Instant Cache Check
      const cacheKey = `ziply_hero_cache_${videoUrl}`;
      if ((window as any)[cacheKey]) {
        setImages((window as any)[cacheKey]);
        setIsExtracting(false);
        return;
      }

      setIsExtracting(true);
      setExtractProgress(0);

      const video = document.createElement("video");
      video.style.position = "fixed";
      video.style.top = "-1000px";
      video.style.width = "1px";
      video.style.height = "1px";
      document.body.appendChild(video);

      video.crossOrigin = "anonymous";
      video.src = videoUrl;
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";

      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.warn("Video metadata load timed out (extended)");
          resolve(false);
        }, 20000); // Increased to 20s for slow first-time loads

        video.onloadedmetadata = () => {
          clearTimeout(timeout);
          video.currentTime = 0;
          resolve(true);
        }
        video.onerror = (e) => {
          clearTimeout(timeout);
          console.error("Video load error:", e);
          resolve(false);
        }
        video.load();
      });

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { alpha: false });
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;

      const extractedImages: HTMLImageElement[] = [];
      const duration = video.duration || 0;

      if (duration === 0) {
        setIsExtracting(false);
        document.body.removeChild(video);
        return;
      }

      for (let i = 0; i < frameCount; i++) {
        const time = (i / (frameCount - 1)) * duration;
        video.currentTime = time;

        await new Promise((resolve) => {
          let resolved = false;
          const onSeeked = () => {
            if (resolved) return;
            resolved = true;
            video.removeEventListener("seeked", onSeeked);
            requestAnimationFrame(() => setTimeout(resolve, 10));
          }
          setTimeout(onSeeked, 1000);
          video.addEventListener("seeked", onSeeked);
        });

        if (ctx) {
          try {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const img = new Image();
            img.src = canvas.toDataURL("image/jpeg", 0.9); // Increased to 0.9 for maximum vibrancy
            await new Promise(r => {
              img.onload = r;
              img.onerror = r;
            });
            extractedImages.push(img);
          } catch (e) {
            console.warn("Frame extraction blocked by CORS or security:", e);
            break;
          }
        }

        setExtractProgress(Math.round(((i + 1) / frameCount) * 100));
      }

      if (extractedImages.length > 0) {
        (window as any)[cacheKey] = extractedImages;
        setImages(extractedImages);
        // Force an immediate draw call for the first frame
        requestAnimationFrame(() => {
          if (canvasRef.current) {
            const dpr = window.devicePixelRatio || 1;
            canvasRef.current.width = window.innerWidth * dpr;
            canvasRef.current.height = window.innerHeight * dpr;
            drawFrame(0);
          }
        });
        // Force scroll progress to 0 to ensure text visibility
        smoothProgress.set(0);
      }

      setIsExtracting(false);
      if (document.body.contains(video)) {
        document.body.removeChild(video);
      }
    };

    extract();
  }, [videoUrl]);

  const drawFrame = (index: number) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    const img = images[index]

    if (canvas && ctx && img) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      const hRatio = canvas.width / img.width
      const vRatio = canvas.height / img.height
      const ratio = Math.max(hRatio, vRatio)
      const centerShift_x = (canvas.width - img.width * ratio) / 2
      const centerShift_y = (canvas.height - img.height * ratio) / 2

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(
        img,
        0, 0, img.width, img.height,
        centerShift_x, centerShift_y, img.width * ratio, img.height * ratio
      )
    }
  }

  useMotionValueEvent(smoothProgress, "change", (latest) => {
    if (isExtracting || images.length === 0) return
    const frameIndex = Math.min(images.length - 1, Math.max(0, Math.floor(latest * (images.length - 1))))
    requestAnimationFrame(() => drawFrame(frameIndex))
  })

  useEffect(() => {
    if (!isExtracting && images.length > 0) {
      // Multiple attempts to ensure the first frame paints on all devices
      const timer1 = setTimeout(() => drawFrame(0), 50)
      const timer2 = setTimeout(() => drawFrame(0), 500)
      const timer3 = setTimeout(() => drawFrame(0), 1000)
      requestAnimationFrame(() => drawFrame(0))
      return () => {
        clearTimeout(timer1)
        clearTimeout(timer2)
        clearTimeout(timer3)
      }
    }
  }, [isExtracting, images])

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const canvas = canvasRef.current
        const dpr = window.devicePixelRatio || 1
        canvas.width = window.innerWidth * dpr
        canvas.height = window.innerHeight * dpr
        canvas.style.width = `${window.innerWidth}px`
        canvas.style.height = `${window.innerHeight}px`
        if (images.length > 0) {
          drawFrame(Math.floor(smoothProgress.get() * (images.length - 1)))
        }
      }
    }
    window.addEventListener("resize", handleResize)
    handleResize()
    return () => window.removeEventListener("resize", handleResize)
  }, [isExtracting, images])

  // Text Animations
  // Added a 0.1 dead zone so the text doesn't "jump" or "lift" immediately
  const titleOpacity = useTransform(smoothProgress, [0, 0.1, 0.25], [1, 1, 0])
  const titleY = useTransform(smoothProgress, [0, 0.1, 0.3], [0, 0, -50])
  const subTitleOpacity = useTransform(smoothProgress, [0.05, 0.15, 0.25], [0, 1, 0])
  const finalTitleOpacity = useTransform(smoothProgress, [0.8, 0.9, 1], [0, 1, 1])

  return (
    <div ref={containerRef} className="relative h-[130vh] bg-black -mt-[110px] md:-mt-[130px]">
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-[#fafaf9]">
        {/* 
            BACKGROUND LOADING LOGIC:
            We show the fallback image immediately so there's no waiting.
            The video frames extract in the background.
        */}
        {/* 
            ZERO-FLASH SLIDER:
            We keep all images in the DOM and just change their opacity.
            This is the most reliable way to prevent "white flashes" on mobile.
        */}
        <AnimatePresence>
          {isExtracting && (
            <m.div
              key="slider-root"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              className="absolute inset-0 z-0 overflow-hidden"
            >
              <m.div
                className="flex h-full w-full"
                animate={{ x: `-${currentSlide * 100}%` }}
                transition={isWarping ? { duration: 0 } : { duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
              >
                {extendedSlides.map((slide: any, idx: number) => (
                  <div
                    key={idx}
                    className="h-full w-full flex-shrink-0 relative"
                  >
                    <img
                      src={slide?.image || slide}
                      alt={`Ziply5 Slide ${idx}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </m.div>
            </m.div>
          )}
        </AnimatePresence>

        <m.canvas
          ref={canvasRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: isExtracting ? 0 : 1 }}
          transition={{ duration: 0.3 }}
          className="w-full h-full object-cover relative z-10"
        />

        {/* Subtle Background Loading Status */}
        {/* Background Loading Status removed from here */}

        <div className="absolute inset-0 z-20 flex items-start pt-32 md:pt-40 lg:pt-20 pointer-events-none">
          <div className="w-full max-w-7xl mx-auto px-4 relative h-full">
            <m.div
              style={{
                opacity: isExtracting ? 1 : titleOpacity,
                y: isExtracting ? 0 : titleY
              }}
              className="max-w-7xl pt-24 md:pt-20"
            >
              <h1 className="font-heading text-3xl md:text-5xl lg:text-7xl font-extrabold text-primary leading-[1.05] whitespace-pre-line drop-shadow-lg">
                {(() => {
                  const title = (isExtracting ? (slides[currentSlide % slides.length]?.title || cmsData?.title) : cmsData?.title) || "Nothing Artificial.\nEverything Delicious.";
                  const words = title.trim().split(/\s+/);
                  if (words.length > 2) {
                    return `${words.slice(0, 2).join(" ")}\n${words.slice(2).join(" ")}`;
                  }
                  return title;
                })()}
              </h1>
              <div className="mt-4">
                <p className="font-heading text-lg md:text-2xl lg:text-4xl font-extrabold leading-snug text-primary uppercase drop-shadow-md whitespace-pre-line">
                  {(() => {
                    const subtitle = (isExtracting ? (slides[currentSlide % slides.length]?.subtitle || cmsData?.subtitle) : cmsData?.subtitle) || "Taste the authentic flavors\nof home-cooked meals!";
                    const words = subtitle.trim().split(/\s+/);
                    if (words.length > 3) {
                      return `${words.slice(0, 3).join(" ")}\n${words.slice(3).join(" ")}`;
                    }
                    return subtitle;
                  })()}
                </p>
              </div>
            </m.div>
          </div>
        </div>
        <div className="absolute inset-0 bg-black/20 pointer-events-none" />
      </div>
    </div>
  )
}
