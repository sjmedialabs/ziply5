"use client"

import { useEffect, useRef, useState } from "react"
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

      video.src = videoUrl;
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";
      video.crossOrigin = "anonymous";

      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.warn("Video metadata load timed out");
          resolve(false);
        }, 8000);

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
          // Add a safety timeout for each frame - live servers can be slow
          setTimeout(onSeeked, 1000); 
          video.addEventListener("seeked", onSeeked);
        });

        if (ctx) {
          try {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const img = new Image();
            img.src = canvas.toDataURL("image/jpeg", 0.7);
            await new Promise(r => {
              img.onload = r;
              img.onerror = r; // Continue even if one frame fails
            });
            extractedImages.push(img);
          } catch (e) {
            console.warn("Frame extraction blocked by CORS or security:", e);
            // If we hit a security error (CORS), we must stop and fallback
            break;
          }
        }

        setExtractProgress(Math.round(((i + 1) / frameCount) * 100));
      }

      if (extractedImages.length > 0) {
        (window as any)[cacheKey] = extractedImages;
        setImages(extractedImages);
      }
      
      setIsExtracting(false);
      if (document.body.contains(video)) {
        document.body.removeChild(video);
      }
    }

    extract();
  }, [videoUrl]);

  const drawFrame = (index: number) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    const img = images[index]

    if (canvas && ctx && img) {
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
  const titleOpacity = useTransform(smoothProgress, [0, 0.1, 0.2], [1, 1, 0])
  const titleY = useTransform(smoothProgress, [0, 0.2], [0, -50])
  const subTitleOpacity = useTransform(smoothProgress, [0.05, 0.15, 0.25], [0, 1, 0])
  const finalTitleOpacity = useTransform(smoothProgress, [0.8, 0.9, 1], [0, 1, 1])

  return (
    <div ref={containerRef} className="relative h-[500vh] bg-black">
      <AnimatePresence>
        {isExtracting && (
          <m.div
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black text-white px-6"
          >
            <div className="text-center">
              <div className="w-20 h-20 border-t-2 border-amber-600 rounded-full animate-spin mx-auto mb-6 shadow-[0_0_20px_rgba(217,119,6,0.2)]" />
              <h3 className="text-xl font-bold tracking-tighter uppercase mb-2">Synchronizing Essence</h3>
              <div className="w-64 h-1 bg-white/10 rounded-full overflow-hidden mx-auto mb-2">
                <m.div
                  className="h-full bg-amber-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${extractProgress}%` }}
                />
              </div>
              <p className="text-[10px] tracking-[0.4em] uppercase font-bold text-white/40">
                Welcome to Ziply5... {extractProgress}%
              </p>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      <div className="sticky top-0 h-screen w-full overflow-hidden bg-black">
        <canvas ref={canvasRef} className="w-full h-full object-cover" />

        <div className="absolute inset-0 flex items-start pt-10 md:pt-14 lg:pt-16 pointer-events-none">
          <div className="w-full max-w-7xl mx-auto px-4 relative h-full">
            <m.div style={{ opacity: titleOpacity, y: titleY }} className="max-w-7xl pt-24 md:pt-32">
              <h1 className="font-heading text-3xl md:text-5xl lg:text-5xl font-extrabold text-amber-900 leading-[1.05] whitespace-pre-line drop-shadow-lg">
                {(() => {
                  const title = cmsData?.title || "Nothing Artificial.\nEverything Delicious.";
                  const words = title.trim().split(/\s+/);
                  if (words.length > 2) {
                    return `${words.slice(0, 2).join(" ")}\n${words.slice(2).join(" ")}`;
                  }
                  return title;
                })()}
              </h1>
              <div className="mt-4">
                <p className="font-heading text-lg md:text-2xl lg:text-3xl font-extrabold text-amber-900 leading-[1.05] uppercase drop-shadow-md">
                  {cmsData?.subtitle || "Taste the authentic flavors\nof home-cooked meals!"}
                </p>
              </div>
            </m.div>

            {/* <m.div style={{ opacity: subTitleOpacity }} className="absolute top-0 left-4 pt-10 md:pt-14 lg:pt-16">
              <h2 className="font-heading text-2xl md:text-4xl lg:text-5xl font-extrabold text-white uppercase tracking-tight drop-shadow-lg">
                Tradition Meets <br /> Modern Convenience.
              </h2>
            </m.div>

            <m.div style={{ opacity: finalTitleOpacity }} className="absolute top-0 left-4 pt-10 md:pt-14 lg:pt-16">
              <h2 className="font-heading text-4xl md:text-7xl lg:text-8xl font-extrabold text-white uppercase tracking-tighter leading-none drop-shadow-2xl">
                Ready to <br /> Taste?
              </h2>
              <div className="mt-8 inline-block px-8 py-3 bg-amber-600 text-white font-bold uppercase tracking-widest rounded-full shadow-2xl">
                Explore Menu
              </div>
            </m.div> */}
          </div>
        </div>
        <div className="absolute inset-0 bg-black/20 pointer-events-none" />
      </div>
    </div>
  )
}
