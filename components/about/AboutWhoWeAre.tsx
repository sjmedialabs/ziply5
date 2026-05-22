"use client";

import { Target, Eye, Heart } from "lucide-react";

interface AboutWhoWeAreProps {
  data?: {
    badge?: string;
    title?: string;
    description?: string;

    missionTitle?: string;
    missionDescription?: string;
    missionColour?: string;
    missionIcon?: string;

    vissionTitle?: string;
    visionDescription?: string;
    visionIcon?: string;
    visionColour?: string;

    valueTitle?: string;
    valuePoints?: string;
    valueColour?: string;
  };
}

export default function AboutWhoWeAre({
  data,
}: AboutWhoWeAreProps) {

  const badge = data?.badge || "WHO WE ARE";

  const title =
    data?.title || "Driven by Purpose,\nDefined by Taste";

  const description =
    data?.description ||
    "More than a food brand — we are a movement to bring authentic, preservative-free Indian home-style meals to every table across the country.";

  const missionTitle =
    data?.missionTitle || "Our Mission";

  const missionDescription =
    data?.missionDescription ||
    "To make wholesome, home-cooked Indian meals accessible to everyone anytime, anywhere with authentic flavour and premium quality.";

  const missionColour =
    data?.missionColour || "#C62828";

  const missionIcon =
    data?.missionIcon;

  const vissionTitle =
    data?.vissionTitle || "Our Vision";

  const visionDescription =
    data?.visionDescription ||
    "To become India's most trusted ready-to-eat food brand by setting new standards for taste, purity, and convenience.";

  const visionColour =
    data?.visionColour || "#3D8B37";

  const visionIcon =
    data?.visionIcon;

  const valueTitle =
    data?.valueTitle || "Our Values";

  const valuePoints =
    data?.valuePoints ||
    `
      <ul>
        <li><strong>Purity First</strong> Zero preservatives, no MSG, no artificial colours.</li>
        <li><strong>Farm to Plate</strong> Ingredients sourced from trusted Indian farms.</li>
        <li><strong>Sustainability</strong> Eco-friendly packaging and responsible sourcing.</li>
        <li><strong>Heritage Recipes</strong> Traditional Indian culinary authenticity.</li>
      </ul>
    `;

  const valueColour =
    data?.valueColour || "#D4A017";

  const cards = [
    {
      number: "01",
      title: missionTitle,
      description: missionDescription,
      iconUrl: missionIcon,
      color: missionColour,
      defaultIcon: <Target className="w-6 h-6 text-white" />,
      isRichText: false,
    },

    {
      number: "02",
      title: vissionTitle,
      description: visionDescription,
      iconUrl: visionIcon,
      color: visionColour,
      defaultIcon: <Eye className="w-6 h-6 text-white" />,
      isRichText: false,
    },

    {
      number: "03",
      title: valueTitle,
      description: valuePoints,
      iconUrl: null,
      color: valueColour,
      defaultIcon: <Heart className="w-6 h-6 text-white" />,
      isRichText: true,
    },
  ];

  return (
    <section className="relative py-24 lg:py-32 bg-[#FAF7F2] overflow-hidden">

      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-[#A53722]/5 blur-[140px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6">

        {/* Header */}
        <div className="max-w-4xl mx-auto text-center">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#A53722]/8 border border-[#A53722]/10 mb-3">
            <span className="w-2 h-2 rounded-full bg-[#A53722]" />

            <span className="uppercase tracking-[0.25em] text-xs font-semibold text-[#A53722]">
              {badge}
            </span>
          </div>

          {/* Title */}
          <h2 className="text-5xl sm:text-3xl lg:text-5xl leading-[1.05] font-semibold text-black whitespace-pre-line">
            {title.split("Taste")[0]}
            <span className="text-[#B5432A] italic">
              Taste
            </span>
          </h2>

          {/* Description */}
          <p className="mt-2 text-[#666] text-lg lg:text-xl leading-9 max-w-3xl mx-auto">
            {description}
          </p>

        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-20">

          {cards.map((card, idx) => (
            <div
              key={idx}
              className="relative bg-white rounded-xl p-8 lg:p-10 shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-[#F1ECE6] overflow-hidden min-h-[520px] flex flex-col"
            >

              {/* Number */}
              <div className="absolute top-7 right-7 text-[72px] font-bold text-black/[0.03] leading-none">
                {card.number}
              </div>

              {/* Icon */}
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg mb-8"
                style={{
                  backgroundColor: card.color,
                }}
              >
                {card.iconUrl ? (
                  <img
                    src={card.iconUrl}
                    alt={card.title}
                    className="w-7 h-7 object-contain brightness-0 invert"
                  />
                ) : (
                  card.defaultIcon
                )}
              </div>

              {/* Title */}
              <h3 className="text-4xl font-semibold text-black leading-tight">
                {card.title}
              </h3>

              {/* Content */}
              <div className="mt-8 flex-1">

                {card.isRichText ? (
                  <div
                    className="
                      text-[#5E5E5E]
                      leading-8
                      text-[17px]

                      [&_ul]:space-y-5
                      [&_li]:relative
                      [&_li]:pl-6
                      [&_li]:list-none
                      [&_li]:before:content-['•']
                      [&_li]:before:absolute
                      [&_li]:before:left-0
                      [&_li]:before:top-0
                      [&_li]:before:text-[#D4A017]
                      [&_strong]:text-black
                      [&_strong]:font-semibold
                    "
                    dangerouslySetInnerHTML={{
                      __html: card.description || "",
                    }}
                  />
                ) : (
                  <p className="text-[#5E5E5E] text-[18px] leading-9">
                    {card.description}
                  </p>
                )}

              </div>

              {/* Bottom Accent */}
              <div
                className="absolute bottom-0 left-0 w-full h-[5px]"
                style={{
                  backgroundColor: card.color,
                }}
              />

            </div>
          ))}

        </div>

      </div>
    </section>
  );
}