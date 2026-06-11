"use client";

interface TrustCard {
  icon?: string;
  title?: string;
  description?: string;
  badge?: string;
  badgeicon?: string;
}

interface AboutWhyChooseUsProps {
  data?: {
    badge?: string;
    title?: string;
    description?: string;
    card?: TrustCard[];
  };
}

export default function AboutWhyChooseUs({
  data,
}: AboutWhyChooseUsProps) {

  const badge =
    data?.badge || "WHY CHOOSE US";

  const title =
    data?.title || "Our Promise to You";

  const description =
    data?.description ||
    "Every product that carries The Taste Company name is a promise — a promise of purity, quality, and unforgettable taste.";

  const cards = data?.card || [
    {
      title: "Ready in 5 Minutes",
      description:
        "Simply heat and eat. Our retort-sealed meals go from shelf to plate in under five minutes.",
      icon: "/assets/AboutPage/icons/ready.png",
      badge: "Quick & Easy",
    },
    {
      title: "Delivered to Your Door",
      description:
        "Order your favourite meals from anywhere in India with secure and fast delivery.",
      icon: "/assets/AboutPage/icons/delivery.png",
      badge: "Pan India",
    },
    {
      title: "Premium Ingredients",
      description:
        "Hand-picked rice, farm-fresh spices, and quality proteins sourced with care.",
      icon: "/assets/AboutPage/icons/taste.png",
      badge: "Farm Fresh",
    },
    {
      title: "Generations of Flavour",
      description:
        "Recipes inspired by authentic South Indian culinary traditions passed down through families.",
      icon: "/assets/AboutPage/icons/star.png",
      badge: "Heritage Recipe",
    },
  ];

  return (
    <section className="py-20 lg:py-24 px-6 bg-[#F8F5F1] relative overflow-hidden">

      {/* Background Glow */}
      <div className="absolute top-[10%] right-[5%] w-[320px] h-[320px] rounded-full bg-[#EADDD7]/40 blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">

        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">

          {badge && (
            <span className="inline-flex items-center px-5 py-2 rounded-full bg-[#F3E5E1] text-[11px] font-medium font-melon uppercase tracking-[0.22em] text-[#51282B]">
              {badge}
            </span>
          )}

          <h2 className="text-3xl sm:text-5xl font-medium font-melon tracking-tight text-[#51282B] leading-[1.1]">
            {title}
          </h2>

          <p className="text-[18px] text-[#666666] leading-[2rem] max-w-3xl mx-auto">
            {description}
          </p>

        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-7">

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
              shadow-[0_8px_30px_rgba(0,0,0,0.05)]
              hover:shadow-[0_14px_40px_rgba(0,0,0,0.08)]
              transition-all
              duration-300
              group
              flex
              flex-col
              h-full
            "
            >

              {/* Top Red Section */}
              <div className="relative h-[160px] bg-[#51282B] overflow-hidden">

                {/* Decorative Circles */}
                <div className="absolute top-[-35px] right-[-35px] w-36 h-36 rounded-full bg-white/8" />

                <div className="absolute bottom-[-20px] left-[-20px] w-24 h-24 rounded-full bg-white/[0.05]" />

                {/* Number */}
                <div className="absolute top-5 right-5 text-[56px] italic font-bold text-white/14 leading-none">
                  0{idx + 1}
                </div>

                {/* Icon */}
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

              {/* Content */}
              <div className="px-7 pt-4 pb-4 flex flex-col flex-1">

                <div>
                  {/* Title */}
                  <h3 className="text-[20px] leading-tight font-medium font-melon text-[#51282B] mb-5">
                    {item.title}
                  </h3>

                  {/* Description */}
                  <p className="text-[#666666] text-[15px] line-clamp-6 leading-[2rem]">
                    {item.description}
                  </p>
                </div>

                {/* Badge */}
                {item.badge && (
                  <div className="mt-auto pt-6">
                    <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-[#E5BFB5] bg-[#FAEEE9]">

                      {item.badgeicon ? (
                        <img
                          src={item.badgeicon}
                          alt=""
                          className="w-3.5 h-3.5 object-contain"
                        />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-[#51282B]" />
                      )}

                      <span className="text-[#51282B] uppercase tracking-[0.12em] text-[11px] font-medium font-melon">
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