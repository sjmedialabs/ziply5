"use client";

import Link from "next/link";
import { ArrowRight, Play, Star } from "lucide-react";

interface AboutHeroProps {
  data?: {
    heroBadge?: string;
    heroTitle?: string;
    heroSubtitle?: string;
    heroButtonLabel?: string;
    heroButtonLink?: string;
    heroVideo?: string;
    heroImage?: string;
    cardTitle?: string;
    cardDescription?: string;
    detailTitle?: string;
    detailDescription?: string;

    stat1Number?: string;
    stat1Label?: string;

    stat2Number?: string;
    stat2Label?: string;
  };
}

export default function AboutHero({ data }: AboutHeroProps) {
  const badge =
    data?.heroBadge || "AUTHENTIC TASTE & CONVENIENCE";

  const title =
    data?.heroTitle ||
    "Our Story,\nYour Taste";

  const subtitle =
    data?.heroSubtitle ||
    "Ziply5 brings wholesome flavour-rich ready meals crafted using premium ingredients and modern food technology.";

  const buttonLabel =
    data?.heroButtonLabel || "Explore Our Menu";

  const buttonLink =
    data?.heroButtonLink || "/collections";

  const heroVideo =
    data?.heroVideo || "/assets/AboutPage/about-video.mp4";

  const heroImage =
    data?.heroImage || "/assets/AboutPage/aboutBanner.png";

  const detailTitle =
    data?.detailTitle || data?.cardTitle || "Where Flavour Meets Tradition";

  const detailDescription =
    data?.detailDescription || data?.cardDescription ||
    "At The Ziply5, we bring you wholesome, flavour-rich, and safe-to-eat ready meals crafted using top-quality ingredients and modern food technology. Every dish is a celebration of India's culinary heritage - from aromatic biryanis to comforting rice meals - prepared with the same love and care as a home-cooked feast, but ready to enjoy in just minutes.";

  const stat1Number =
    data?.stat1Number || "10+";

  const stat1Label =
    data?.stat1Label || "Flavours Crafted";

  const stat2Number =
    data?.stat2Number || "100%";

  const stat2Label =
    data?.stat2Label || "Authentic Recipes";

  return (
    <section className="relative bg-[#F7F3EE]">

      {/* Top Content Area */}
      <div className="relative z-20 py-8 px-4">
        <div className="max-w-7xl mx-auto">

          <div className="grid lg:grid-cols-12 gap-12">

            {/* Left Content */}
            <div className="lg:col-span-6">

              {/* Badge */}
              <div className="inline-flex font-melon items-center gap-2 px-4 py-2 rounded-full border border-[#A44A3F]/20 bg-[#A44A3F]/5 mb-6">
                <span className="w-2 h-2 rounded-full bg-[#51282B]" />
                <span className="text-xs tracking-[0.18em] uppercase font-medium text-[#51282B]">
                  {badge}
                </span>
              </div>

              {/* Heading */}
              <h1 className="text-5xl font-melon sm:text-6xl lg:text-5xl leading-[0.95] text-[#51282B]">
                {title}
              </h1>

              {/* Subtitle */}
              {/* <p className="mt-7 text-[#555555] text-lg leading-8 max-w-2xl">
                {subtitle}
              </p> */}

              {/* CTA */}
              {/* <div className="mt-10 flex flex-wrap items-center gap-5">

                <Link
                  href={buttonLink}
                  className="group inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#51282B] text-white text-sm font-medium hover:bg-[#8C2E1B] transition-all duration-300 shadow-xl"
                >
                  {buttonLabel}

                  <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>

                <button className="inline-flex items-center gap-3 text-[#222] font-medium">
                  <div className="w-12 h-12 rounded-full border border-[#DDD] bg-white flex items-center justify-center shadow-sm">
                    <Play className="w-4 h-4 fill-current" />
                  </div>

                  Watch Our Journey
                </button>

              </div> */}
            </div>

            {/* Right Stats */}
            <div className="lg:col-span-6 flex lg:justify-end">
              <div className="grid grid-cols-2 font-melon gap-10 lg:gap-16">

                <div>
                    <h2 className="text-6xl lg:text-7xl font-medium text-[#51282B]">
                      {stat1Number}
                  </h2>

                  <p className="mt-2 text-xl text-[#51282B]">
                    {stat1Label}
                  </p>
                </div>

                <div>
                  <h2 className="text-6xl lg:text-7xl font-medium text-[#51282B]">
                    {stat2Number}
                  </h2>

                  <p className="mt-2 text-xl text-[#51282B]">
                    {stat2Label}
                  </p>
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Video Banner Area */}
      <div className="relative h-125">

        {/* Background Video */}
        <video
          autoPlay
          muted
          loop
          playsInline
          poster={heroImage}
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src={heroVideo} type="video/mp4" />
        </video>

        {/* Overlay */}
        <div className="absolute inset-0 bg-black/25" />

        {/* Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

        {/* Floating Detail Card */}
        <div className="absolute top-[70%] right-4 left-4 lg:left-auto hidden md:block lg:right-16 z-20">

          <div className="max-w-lg bg-[#51282B] space-y-2 rounded-4xl p-7 lg:p-9 shadow-2xl border border-white/10">

            {/* Top */}
            {/* <div className="flex items-center gap-3 mb-3">

              <div className="w-14 h-14 rounded-full bg-[#F9E8D2] flex items-center justify-center shrink-0">
                <Star className="w-6 h-6 text-[#51282B] fill-[#51282B]" />
              </div>

              <div>
                <p className="text-[#FFD9B8] uppercase text-xs tracking-[0.2em] font-medium">
                  Premium Indian Meals
                </p>

                <h3 className="text-white font-medium text-lg">
                  Chef Crafted Experience
                </h3>
              </div>

            </div> */}

            {/* Content */}
            <h3 className="text-2xl font-melon font-medium text-white leading-tight">
              {detailTitle}
            </h3>

            <p className="text-white/85 text-[15px]">
              {detailDescription}
            </p>

          </div>

        </div>

      </div>

    </section>
  );
}