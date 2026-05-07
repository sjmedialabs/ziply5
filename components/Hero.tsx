"use client"

import VideoScrollHero from "./VideoScrollHero"
import SliderHero from "./SliderHero"

interface HeroProps {
  cmsData?: {
    title?: string
    subtitle?: string
    videoUrl?: string
    slides?: any[]
  }
}

/**
 * The Smart Hero Router
 * Automatically switches between a Smooth Scroll Video Animation
 * and a standard Image Slider based on CMS content.
 */
export default function Hero({ cmsData }: HeroProps) {
  // If a video URL is provided in the CMS, use the high-end Scroll Animation
  if (cmsData?.videoUrl) {
    return <VideoScrollHero videoUrl={cmsData.videoUrl} cmsData={cmsData} />
  }

  // Fallback to the standard Slider if no video is present
  return <SliderHero cmsData={cmsData} />
}
