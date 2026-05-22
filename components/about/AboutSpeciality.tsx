"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface SpecialityStat {
  stat?: string;
  desciption?: string;
}

interface AboutSpecialityProps {
  data?: {
    badge?: string;
    title?: string;
    description?: string;
    stats?: SpecialityStat[];
    points?: string[];
    cta?: string;
    ctaLink?: string;
    image?: string;
  };
}

export default function AboutSpeciality({
  data,
}: AboutSpecialityProps) {

  const badge =
    data?.badge || "OUR SPECIALITY";

  const title =
    data?.title ||
    "The Ziply5's Signature Biryani Range";

  const description =
    data?.description ||
    "Experience the magic of a perfectly layered biryani — fragrant basmati rice, slow-cooked with a proprietary blend of whole spices and premium-quality proteins.";

  const stats = data?.stats || [
    {
      stat: "3+",
      desciption: "Biryani Variants",
    },
    {
      stat: "5 min",
      desciption: "Ready To Eat",
    },
    {
      stat: "0",
      desciption: "Preservatives",
    },
  ];

  const points = data?.points || [
    "Traditional Dum-Style Cooking",
    "Premium Basmati Rice",
    "Hand-Ground Whole Spices",
    "Retort-Sealed for Freshness",
  ];

  const cta =
    data?.cta || "Explore Biryani Range";

  const ctaLink =
    data?.ctaLink || "/collections";

  const image =
    data?.image ||
    "/assets/AboutPage/aboutHero.jpg";

  return (
    <section className="bg-[#F8F5F1] overflow-hidden">

      <div className="grid lg:grid-cols-2 items-stretch">

        {/* LEFT IMAGE */}
        <div className="relative min-h-[300px] lg:min-h-[70px]">

          <img
            src={image}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Overlay */}
          <div className="absolute inset-0 bg-black/10" />

        </div>

        {/* RIGHT CONTENT */}
        <div className="flex items-center px-6 py-12 lg:px-16">

          <div className="max-w-2xl w-full">

            {/* Badge */}
            <div className="w-full rounded-full bg-[#EFE7E4] px-5 py-3 mb-8">

              <span className="text-xs font-bold uppercase tracking-[0.25em] text-[#B6402C]">
                {badge}
              </span>

            </div>

            {/* Title */}
            <h2 className="text-3xl lg:text-5xl font-bold leading-[1.05] tracking-tight text-black">

              {title.split("Signature")[0]}

              <span className="text-[#B6402C]">
                Signature
              </span>
              {title.split("Signature")[1]}
            </h2>

            {/* Description */}
            <p className="mt-4 text-base leading-[2.2rem] text-[#555555]">
              {description}
            </p>

            {/* Stats Box */}
            {stats.length > 0 && (

              <div className="mt-4 bg-white rounded-[2rem] border border-[#ECE1DA] p-4 shadow-sm">

                <div className="grid grid-cols-3">

                  {stats.map((item, idx) => (

                    <div
                      key={idx}
                      className={`
                        text-center
                        px-4
                        ${idx !== stats.length - 1
                          ? "border-r border-[#E7D8D1]"
                          : ""
                        }
                      `}
                    >

                      <h3 className="text-3xl font-bold text-[#B6402C] leading-none">
                        {item.stat}
                      </h3>

                      <p className="mt-2 text-xs uppercase tracking-[0.18em] font-semibold text-[#666666] leading-relaxed">
                        {item.desciption}
                      </p>

                    </div>

                  ))}

                </div>

              </div>

            )}

            {/* Points */}
            {points.length > 0 && (

              <div className="mt-10 grid sm:grid-cols-2 gap-y-5 gap-x-10">

                {points.map((point, idx) => (

                  <div
                    key={idx}
                    className="flex items-start gap-3"
                  >

                    <div className="w-2.5 h-2.5 rounded-full bg-[#B6402C] mt-3 shrink-0" />

                    <p className="text-[#2B2B2B] text-base font-semibold leading-[1.9rem]">
                      {point}
                    </p>

                  </div>

                ))}

              </div>

            )}

            {/* CTA */}
            {cta && ctaLink && (

              <div className="mt-14">

                <Link
                  href={ctaLink}
                  className="
                    group
                    inline-flex
                    items-center
                    gap-3
                    px-10
                    py-5
                    rounded-full
                    bg-[#B6402C]
                    hover:bg-[#982F1E]
                    text-white
                    font-semibold
                    text-lg
                    transition-all
                    duration-300
                    shadow-xl
                    hover:shadow-2xl
                  "
                >

                  {cta}

                  <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />

                </Link>

              </div>

            )}

          </div>

        </div>

      </div>

    </section>
  );
}