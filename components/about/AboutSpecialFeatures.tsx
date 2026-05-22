"use client";

interface FeatureCard {
  icon?: string;
  title?: string;
  description?: string;
  badge?: string;
  badgeicon?: string;
}

interface AboutSpecialFeaturesProps {
  data?: {
    badge?: string;
    title?: string;
    description?: string;
    card?: FeatureCard[];
  };
}

export default function AboutSpecialFeatures({
  data,
}: AboutSpecialFeaturesProps) {

  const badge =
    data?.badge || "WHAT MAKES US SPECIAL";

  const title =
    data?.title || "Unique Eating Proposition";

  const description =
    data?.description ||
    "Instant food redefined with quality you can trust. Every meal is a promise of purity, taste, and tradition.";

  const cards = data?.card || [
    {
      title: "Zero Preservatives",
      description:
        "100% natural ingredients without any artificial preservatives. Pure, clean, and healthy food for your family.",
      icon: "/assets/AboutPage/icons/zero.png",
      badge: "100% Natural",
    },
    {
      title: "Halal Certified",
      description:
        "All our products are Halal certified, ensuring the highest standards of quality and authenticity in every bite.",
      icon: "/assets/AboutPage/icons/taste.png",
      badge: "Certified Quality",
    },
    {
      title: "Eco-Friendly Packaging",
      description:
        "Sustainable packaging that's good for the planet. We care about the environment as much as we care about taste.",
      icon: "/assets/AboutPage/icons/shelflife.png",
      badge: "Eco Conscious",
    },
  ];

  return (
    <section className="relative py-24 lg:py-32 px-6 bg-white overflow-hidden">

      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-[#B6402C]/5 blur-[120px]" />

      <div className="max-w-7xl mx-auto relative z-10">

        {/* HEADER */}
        <div className="max-w-3xl mx-auto text-center mb-12">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-[#E5CFC7] bg-[#F5E9E6] mb-5">

            <div className="w-2 h-2 rounded-full bg-[#B6402C]" />

            <span className="text-xs font-bold uppercase tracking-[0.25em] text-[#B6402C]">
              {badge}
            </span>

          </div>

          {/* Title */}
          <h2 className="text-5xl lg:text-6xl font-bold tracking-tight text-black leading-[1.05]">
            {title}
          </h2>

          {/* Description */}
          <p className="mt-2 text-[20px] leading-[2.1rem] text-[#666666] max-w-2xl mx-auto">
            {description}
          </p>

        </div>

        {/* CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">

          {cards.map((item, idx) => (

            <div
              key={idx}
              className="
    relative
    rounded-[2rem]
    overflow-hidden
    bg-[#FBF7F3]
    border
    border-[#E8D8D2]
    shadow-[0_8px_30px_rgba(0,0,0,0.04)]
    hover:shadow-[0_14px_40px_rgba(0,0,0,0.08)]
    transition-all
    duration-300
    group
  "
            >

              {/* TOP SECTION */}
              <div className="relative h-[165px] bg-gradient-to-br from-[#B9331D] via-[#C53E26] to-[#D95433] overflow-hidden">

                {/* Top Right Circle */}
                <div className="absolute top-[-35px] right-[-35px] w-36 h-36 rounded-full bg-white/7" />

                {/* Left Circle */}
                <div className="absolute bottom-[-25px] left-[-25px] w-24 h-24 rounded-full bg-white/[0.04]" />

                {/* Number */}
                <div className="absolute top-5 right-5 text-[58px] italic font-bold text-white/14 leading-none">
                  0{idx + 1}
                </div>

                {/* Icon Circle */}
                <div className="absolute left-7 top-8">

                  <div className="w-[78px] h-[78px] rounded-full border border-white/35 bg-white/10 backdrop-blur-sm flex items-center justify-center">

                    {item.icon ? (
                      <img
                        src={item.icon}
                        alt={item.title}
                        className="w-9 h-9 object-contain brightness-0 invert"
                      />
                    ) : (
                      <span className="text-white text-xl">
                        ★
                      </span>
                    )}

                  </div>

                </div>

                {/* Curved Divider */}
                <div className="absolute -bottom-[52px] left-1/2 -translate-x-1/2 w-[125%] h-[105px] bg-[#FBF7F3] rounded-[100%]" />

              </div>

              {/* CONTENT */}
              <div className="relative px-7 pt-9 pb-8 min-h-[250px] flex flex-col">

                {/* Title */}
                <h3 className="text-[21px] leading-tight font-bold text-[#A12F1C] mb-5">
                  {item.title}
                </h3>

                {/* Description */}
                <p className="text-[#666666] text-[15px] leading-[2rem] flex-1">
                  {item.description}
                </p>

                {/* Badge */}
                {item.badge && (

                  <div className="mt-7">

                    <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-[#E5BFB5] bg-[#FAEEE9]">

                      {item.badgeicon ? (
                        <img
                          src={item.badgeicon}
                          alt=""
                          className="w-3.5 h-3.5 object-contain"
                        />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-[#B6402C]" />
                      )}

                      <span className="text-[#B6402C] uppercase tracking-[0.12em] text-[11px] font-bold">
                        {item.badge}
                      </span>

                    </div>

                  </div>

                )}

              </div>

            </div>

          ))}

        </div>

      </div>

    </section>
  );
}