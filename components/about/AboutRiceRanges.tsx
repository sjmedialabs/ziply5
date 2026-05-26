"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface RiceRangeStat {
  stat?: string;
  desciption?: string;
}

interface AboutRiceRangesProps {
  data?: {
    badge?: string;
    title?: string;
    description?: string;
    stats?: RiceRangeStat[];
    points?: string[];
    cta?: string;
    ctaLink?: string;
    image?: string;
  };
}

export default function AboutRiceRanges({
  data,
}: AboutRiceRangesProps) {

  const badge =
    data?.badge || "OUR RICE RANGE";

  const title =
    data?.title ||
    "Comfort in Every Grain — Our Rice Meal Collection";

  const description =
    data?.description ||
    "From the earthy warmth of Sambar Rice and the creamy richness of Paneer Curry Rice to the traditional simplicity of Pongal — our rice meal range captures the soul of everyday South Indian home cooking, ready in minutes wherever you are.";

  const stats = data?.stats || [
    {
      stat: "6+",
      desciption: "Rice Variants",
    },
    {
      stat: "5 min",
      desciption: "Ready To Eat",
    },
    {
      stat: "100%",
      desciption: "Authentic",
    },
  ];

  const points = data?.points || [
    "Authentic Regional Recipes",
    "Hand-Ground Spice Blends",
    "Veg & Non-Veg Options",
    "Fresh-Sealed, No Preservatives",
  ];

  const cta =
    data?.cta || "Explore Rice Meals";

  const ctaLink =
    data?.ctaLink || "/collections";

  const image =
    data?.image ||
    "/assets/AboutPage/missionAbout.png";

  return (
    <section className="bg-[#F7F3F1] overflow-hidden">

      <div className="grid lg:grid-cols-2 items-stretch">

        {/* LEFT CONTENT */}
        <div className="flex items-center px-4 sm:px-6 lg:px-14 py-16">

          <div className="max-w-2xl w-full">

            {/* Badge */}
            <div className="w-full rounded-full bg-[#EEDFDA] px-4 py-2.5 mb-7">

              <span className="text-[11px] font-medium font-melon uppercase tracking-[0.28em] text-[#51282B]">
                {badge}
              </span>

            </div>

            {/* Title */}
            <h2 className="text-3xl lg:text-5xl font-medium font-melon leading-[1.12] tracking-tight text-black">
{/* 
              Comfort in Every Grain —

              <span className="text-[#B6402C]">
                {" "}Our Rice Meal {" "}
              </span>
              Collection */}
            
              {title.split("Our Rice Meal")[0]}

              <span className="text-[#51282B]">
                Our Rice Meal
              </span>
              {title.split("Our Rice Meal")[1]}
            </h2>

            {/* Description */}
            <p className="mt-4 text-base leading-[2rem] text-[#5B5B5B]">
              {description}
            </p>

            {/* Stats */}
            {stats.length > 0 && (

              <div className="mt-4 bg-white rounded-[1.7rem] border border-[#E7D9D3] p-3 sm:p-4 shadow-sm">

                <div className="grid grid-cols-3">

                  {stats.map((item, idx) => (

                    <div
                      key={idx}
                      className={`
                        text-center
                        px-1 sm:px-2 md:px-3
                        ${idx !== stats.length - 1
                          ? "border-r border-[#E8DCD6]"
                          : ""
                        }
                      `}
                    >

                      <h3 className="text-2xl sm:text-3xl font-medium font-melon text-[#51282B] leading-none">
                        {item.stat}
                      </h3>

                      <p className="mt-2 text-[9px] sm:text-[10px] uppercase tracking-[0.05em] sm:tracking-[0.16em] font-medium text-[#666666] break-words">
                        {item.desciption}
                      </p>

                    </div>

                  ))}

                </div>

              </div>

            )}

            {/* Points */}
            {points.length > 0 && (

              <div className="mt-6 grid sm:grid-cols-2 gap-y-5 gap-x-10">

                {points.map((point, idx) => (

                  <div
                    key={idx}
                    className="flex items-start gap-3"
                  >

                    <div className="w-2.5 h-2.5 rounded-full bg-[#51282B] mt-3 shrink-0" />

                    <p className="text-[#2B2B2B] text-[16px] font-medium font-melon leading-[1.7rem]">
                      {point}
                    </p>

                  </div>

                ))}

              </div>

            )}

            {/* CTA */}
            {cta && ctaLink && (

              <div className="mt-8">

                <Link
                  href={ctaLink}
                  className="
                    group
                    inline-flex
                    items-center
                    gap-2.5
                    px-8
                    py-4
                    rounded-full
                    bg-[#51282B]
                    font-melon
                    hover:bg-[#982F1E]
                    text-white
                    font-medium
                    text-base
                    transition-all
                    duration-300
                    shadow-lg
                  "
                >

                  {cta}

                  <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />

                </Link>

              </div>

            )}

          </div>

        </div>

        {/* RIGHT IMAGE */}
        <div className="relative min-h-[420px] lg:min-h-[700px]">

          <img
            src={image}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Overlay */}
          <div className="absolute inset-0 bg-black/10" />

        </div>

      </div>

    </section>
  );
}