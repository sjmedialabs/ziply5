"use client";

import { MessageCircleMore } from "lucide-react";

interface AboutStoryProps {
  data?: {
    badge?: string;
    title?: string;
    description?: string[];
    image?: string;
  };
}

export default function AboutStory({ data }: AboutStoryProps) {
  const badge = data?.badge || "OUR STORY";

  const title =
    data?.title || "Where Health Meets Taste";

  const descriptions = data?.description || [
    "We started Ziply5 with a simple belief: everyone deserves a wholesome, home-cooked meal — no matter how busy life gets. Our culinary experts and food specialists work together to create recipes that preserve authentic Indian flavours while embracing modern food innovation.",
    "Using advanced retort processing technology, we seal the freshness and nutrients of every dish at peak flavour - without a single artificial preservative, colour, or enhancer.",
    "From the first grain of basmati rice to the final blend of hand-ground spices, every ingredient is carefully selected to deliver meals that are not just delicious, but genuinely nourishing.",
  ];

  const image =
    data?.image ||
    "/assets/AboutPage/missionAbout.png";

  return (
    <section className="bg-[#F8F5F1] overflow-hidden">

      <div className="grid lg:grid-cols-2 items-stretch">

        {/* LEFT IMAGE SECTION */}
        <div className="relative h-full min-h-100 lg:min-h-140">

          <img
            src={image}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Dark Overlay */}
          <div className="absolute inset-0 bg-[#3D1416]/35" />

          {/* Floating Story Card */}
          <div className="absolute bottom-8 left-8 bg-white rounded-2xl px-6 py-5 shadow-2xl flex items-center gap-4">

            <div className="w-14 h-14 rounded-full bg-[#51282B] flex items-center justify-center">
              <MessageCircleMore className="w-6 h-6 text-white" />
            </div>

            <div>
              <p className="text-[#51282B] text-sm font-medium font-melon uppercase tracking-wide">
                Our Story
              </p>

              <p className="text-[#444] text-sm">
                Since Day One
              </p>
            </div>

          </div>

        </div>

        {/* RIGHT CONTENT SECTION */}
        <div className="flex items-center bg-white px-6 lg:px-14 py-16 lg:py-20">

          <div className="max-w-2xl w-full">

            {/* Badge */}
            <div className="w-full rounded-full font-melon bg-[#EFE7E4] px-5 py-3 mb-8">

              <span className="text-xs font-medium uppercase tracking-[0.25em] text-[#51282B]">
                {badge}
              </span>

            </div>

            {/* Title */}
            <h2 className="text-3xl lg:text-5xl font-medium font-melon leading-[1.05] tracking-tight text-black">

              {title.split("Meets")[0]}

              <span className="text-[#51282B]">
                Meets{title.split("Meets")[1]}
              </span>

            </h2>

            {/* First Paragraph */}
            <p className="mt-4 text-base leading-[2.2rem] text-[#555555]">
              {descriptions[0]}
            </p>

            {/* Highlight Quote Box */}
            <div className="mt-4 bg-[#F5E9E6] border-l-4 border-[#B6402C] rounded-r-2xl px-8 py-7">

              <div className="flex gap-5">

                <MessageCircleMore className="w-6 h-6 text-[#B6402C] shrink-0 mt-1" />

                <p className="text-[#5A3A35] italic text-base leading-[2rem]">
                 {descriptions[1]}</p>

              </div>

            </div>

            {/* Second Paragraph */}
            <p className="mt-4 text-base leading-[2.2rem] text-[#555555]">
              {descriptions[2]}
            </p>

          </div>

        </div>

      </div>

    </section>
  );
}