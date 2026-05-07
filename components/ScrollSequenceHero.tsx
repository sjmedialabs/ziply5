"use client";

import { useEffect, useRef, useState } from "react";
import { m, useScroll, useTransform, useSpring, useMotionValueEvent, AnimatePresence } from "framer-motion";

interface ScrollSequenceHeroProps {
  cmsData?: any;
}

export default function ScrollSequenceHero({ cmsData }: ScrollSequenceHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const [imagesLoaded, setImagesLoaded] = useState(0);
  const [isReady, setIsReady] = useState(false);

  const frameCount = 200;
  const imageFolder = "/assets/Ziply5 anime images";
  const imagePrefix = "ezgif-frame-";
  const imageExtension = "jpg";

  // 1. Scroll Setup
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Smooth out the scroll for a premium feel
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  // 2. Preload Images
  useEffect(() => {
    const preloadImages = async () => {
      const promises = [];
      for (let i = 1; i <= frameCount; i++) {
        const promise = new Promise<void>((resolve) => {
          const img = new Image();
          const frameNumber = i.toString().padStart(3, '0');
          img.src = `${imageFolder}/${imagePrefix}${frameNumber}.${imageExtension}`;
          img.onload = () => {
            imagesRef.current[i - 1] = img;
            setImagesLoaded(prev => prev + 1);
            resolve();
          };
          img.onerror = () => {
            console.error(`Failed to load: ${img.src}`);
            resolve();
          };
        });
        promises.push(promise);
      }
      await Promise.all(promises);
      setIsReady(true);
    };

    preloadImages();
  }, []);

  // 3. Canvas Drawing Logic
  const drawFrame = (index: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const img = imagesRef.current[index];

    if (canvas && ctx && img) {
      const hRatio = canvas.width / img.width;
      const vRatio = canvas.height / img.height;
      const ratio = Math.max(hRatio, vRatio);
      const centerShift_x = (canvas.width - img.width * ratio) / 2;
      const centerShift_y = (canvas.height - img.height * ratio) / 2;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(
        img,
        0, 0, img.width, img.height,
        centerShift_x, centerShift_y, img.width * ratio, img.height * ratio
      );
    }
  };

  // Update canvas on scroll
  useMotionValueEvent(smoothProgress, "change", (latest) => {
    const frameIndex = Math.min(
      frameCount - 1,
      Math.max(0, Math.floor(latest * (frameCount - 1)))
    );
    requestAnimationFrame(() => drawFrame(frameIndex));
  });

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerHeight}px`;

        const currentProgress = smoothProgress.get();
        const currentFrame = Math.floor(currentProgress * (frameCount - 1));
        drawFrame(currentFrame);
      }
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, [isReady]);

  // 4. Content Opacity Mapping
  const titleOpacity = useTransform(smoothProgress, [0, 0.1, 0.2], [1, 1, 0]);
  const titleY = useTransform(smoothProgress, [0, 0.2], [0, -50]);

  const subTitleOpacity = useTransform(smoothProgress, [0.05, 0.15, 0.25], [0, 1, 0]);

  const midTextOpacity = useTransform(smoothProgress, [0.4, 0.5, 0.6], [0, 1, 0]);
  const midTextScale = useTransform(smoothProgress, [0.4, 0.5, 0.6], [0.8, 1, 1.1]);

  const finalTitleOpacity = useTransform(smoothProgress, [0.8, 0.9, 1], [0, 1, 1]);

  return (
    <div ref={containerRef} className="relative h-[800vh] bg-black">
      {/* Loading Overlay */}
      <AnimatePresence>
        {!isReady && (
          <m.div
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black text-white"
          >
            <div className="w-64 h-1 bg-white/10 rounded-full overflow-hidden">
              <m.div
                className="h-full bg-amber-600 shadow-[0_0_15px_rgba(217,119,6,0.5)]"
                initial={{ width: 0 }}
                animate={{ width: `${(imagesLoaded / frameCount) * 100}%` }}
              />
            </div>
            <p className="mt-6 text-[10px] tracking-[0.4em] uppercase font-bold text-amber-500/80">
              Initializing Experience {Math.round((imagesLoaded / frameCount) * 100)}%
            </p>
          </m.div>
        )}
      </AnimatePresence>

      {/* Sticky Canvas */}
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full object-cover"
        />

        {/* Dynamic Text Layers */}
        <div className="absolute inset-0 flex items-start pt-10 md:pt-14 lg:pt-16 pointer-events-none">
          <div className="w-full max-w-7xl mx-auto px-4 relative h-full">

            {/* Phase 1: Initial Title & Subtitle (Original Look) */}
            <m.div
              style={{ opacity: titleOpacity, y: titleY }}
              className="max-w-7xl"
            >
              <h1 className="font-heading text-3xl md:text-5xl lg:text-7xl font-extrabold text-primary leading-[1.05] whitespace-pre-line">
                {cmsData?.title || "Nothing Artificial.\nEverything Delicious."}
              </h1>
              <div className="mt-4">
                <p
                  className="font-heading text-lg md:text-2xl lg:text-4xl font-extrabold text-primary leading-[1.05] uppercase"
                  style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.1)" }}
                >
                  {cmsData?.subtitle || "Taste the authentic flavors\nof home-cooked meals!"}
                </p>
              </div>
            </m.div>

            {/* Phase 2: Scrolling Facts / Philosophy */}
            <m.div
              style={{ opacity: subTitleOpacity }}
              className="absolute top-0 left-4 pt-10 md:pt-14 lg:pt-16"
            >
              <p className="text-primary/60 text-xs tracking-[0.3em] uppercase mb-2 font-bold">The Philosophy</p>
              <h2 className="font-heading text-2xl md:text-4xl lg:text-5xl font-extrabold text-primary uppercase tracking-tight">
                Crafted with Tradition, <br /> Delivered with Love.
              </h2>
            </m.div>

            {/* Phase 3: Mid-point Quality Emphasis */}
            <m.div
              style={{ opacity: midTextOpacity, scale: midTextScale }}
              className="absolute top-0 left-4 pt-10 md:pt-14 lg:pt-16"
            >
              <h2 className="font-heading text-4xl md:text-7xl font-black text-primary uppercase italic leading-none">
                Premium <span className="text-amber-800">Ziply</span> <br /> Quality
              </h2>
            </m.div>

            {/* Phase 4: Final CTA */}
            <m.div
              style={{ opacity: finalTitleOpacity }}
              className="absolute top-0 left-4 pt-10 md:pt-14 lg:pt-16"
            >
              <h2 className="font-heading text-4xl md:text-7xl lg:text-8xl font-extrabold text-primary uppercase tracking-tighter leading-none">
                Ready to <br /> Taste?
              </h2>
              <div className="mt-8 inline-block px-8 py-3 bg-primary text-white font-bold uppercase tracking-widest rounded-full shadow-lg">
                Explore Menu
              </div>
            </m.div>

          </div>
        </div>

        {/* Ambient Overlay to make text pop */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />
      </div>
    </div>
  );
}
