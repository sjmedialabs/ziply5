"use client";

import { MapPin, MessageCircleMore, Check } from "lucide-react";

interface AboutFarmToPlateProps {
  data?: {
    badge?: string;
    title?: string;
    description?: string[];
    points?: string[];
    image?: string;
  };
}

export default function AboutFarmToPlate({
  data,
}: AboutFarmToPlateProps) {
  const badge =
    data?.badge || "Farm To Plate";

  const title =
    data?.title ||
    "Sourced from the Heart of India's Farms";

  const descriptions = data?.description || [
    "Great meals begin with great ingredients. We work directly with trusted farmers across India to source the freshest spices, premium basmati rice, and hand-picked vegetables.",

    "This farm-to-plate approach doesn't just deliver superior quality to your dining table — it empowers farming communities with stable incomes and sustainable practices.",
  ];

  const points = data?.points || [
    "Tamil Nadu",
    "Karnataka",
    "Andhra Pradesh",
  ];

  const image =
    data?.image ||
    "/assets/AboutPage/aboutHero.jpg";

  return (
    <section className="bg-[#F8F5F1] overflow-hidden">

      <div className="grid lg:grid-cols-2 items-stretch">

        {/* LEFT CONTENT */}
        <div className="flex items-center px-6 lg:px-14 py-20 lg:py-28">

          <div className="max-w-2xl w-full">

            {/* Badge */}
            <div className="w-full rounded-full bg-[#EFE7E4] px-5 py-3 mb-8">

              <span className="text-xs font-bold uppercase tracking-[0.25em] text-[#B6402C]">
                {badge}
              </span>

            </div>

            {/* Heading */}
            <h2 className="text-3xl lg:text-5xl font-bold leading-[1.05] tracking-tight text-black">

              {title.split(" Heart of India's")[0]}

              <span className="text-[#B6402C]">
              {" "}  Heart of India's{title.split(" Heart of India's")[1]}
              </span>

            </h2>

            {/* Description */}
            <div className="mt-4 space-y-8">

              <p className="text-base leading-[2.2rem] text-[#555555]">
                {descriptions[0]}
              </p>

            </div>

            {/* Highlight Quote Box */}
            <div className="mt-4 bg-[#F5E9E6] border-l-4 border-[#B6402C] rounded-r-2xl px-8 py-7">

              <div className="flex gap-5">

                <MessageCircleMore className="w-6 h-6 text-[#B6402C] shrink-0 mt-1" />

                <p className="text-[#5A3A35] italic text-base leading-[2rem]">
                 {descriptions[1]}</p>

              </div>

            </div>

            {/* Second Description */}
            <p className="mt-4 text-base leading-[2.2rem] text-[#555555]">
              {descriptions[2]}
            </p>

            {/* Bottom Pills */}
            <div className="mt-12 flex flex-wrap gap-4">

              {points.map((point, idx) => (
                <div
                  key={idx}
                  className="inline-flex items-center gap-3 px-6 py-3 rounded-full border border-[#E6C9BF] bg-[#FAF1EE]"
                >

                  <Check className="w-4 h-4 text-[#B6402C]" />

                  <span className="text-[#B6402C] font-semibold">
                    {point}
                  </span>

                </div>
              ))}

            </div>

          </div>

        </div>

        {/* RIGHT IMAGE */}
        <div className="relative min-h-[500px] lg:min-h-[780px]">

          <img
            src={image}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Overlay */}
          <div className="absolute inset-0 bg-black/10" />

          {/* Floating Card */}
          <div className="absolute bottom-8 left-8 bg-white rounded-2xl px-6 py-5 shadow-2xl flex items-center gap-4">

            <div className="w-14 h-14 rounded-full bg-[#C53B22] flex items-center justify-center">
              <MapPin className="w-6 h-6 text-white" />
            </div>

            <div>

              <p className="text-[#C53B22] text-sm font-bold uppercase tracking-wide">
                Farm Fresh
              </p>

              <p className="text-[#444] text-sm">
                100% Traceable
              </p>

            </div>

          </div>

        </div>

      </div>

    </section>
  );
}