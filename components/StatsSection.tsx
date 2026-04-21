export function StatsSection({ data }: { data?: any }) {
  const defaultStats = [
    {
      title: "ZERO PRESERVATIVES",
      description: "Delight your guests with our flavors and  presentation",
      iconUrl: "assets/AboutPage/FruitIcon.png",
    },
    {
      title: "99% MICROBE-FREE",
      description: "We deliver your order promptly to your door",
      iconUrl: "assets/AboutPage/timeIcon.png",
    },
    {
      title: "EASY RETURNS",
      description: "Explore menu & order with ease using our Online Ordering ",
      iconUrl: "assets/AboutPage/shoppinIcon.png",
    },
    {
      title: "FREE SHIPPING",
      description: "Give the gift of exceptional dining with Foodi Gift Cards",
      iconUrl: "assets/AboutPage/giftIcon.png",
    },
  ];

  const titleString = data?.title || "Our Statistics";
  const titleWords = titleString.split(" ");
  const firstWord = titleWords[0];
  const secondWord = titleWords[1];
  const restOfTitle = titleWords.slice(2).join(" ");

  const mainDescription = data?.mainDescription || "What makes us special through our impressive statistics.";
  const displayStats = data?.stats?.length > 0 ? data.stats : defaultStats;

  return (
    <section className="py-20 text-center">

      {/* Heading */}
      <div className=" max-w-sm mx-auto ">
      <h2 className="text-4xl font-bold mb-2 font-melon tracking-wider leading-12">
        {firstWord} {secondWord && <span className="text-primary">{secondWord}</span>} {restOfTitle}
      </h2>
      <p className="text-[#646464] mb-12">
        {mainDescription}
      </p>
        </div>
      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 px-6 max-w-6xl mx-auto">
        {displayStats.map((item: any, i: number) => (
          <div
            key={i}
            className="bg-white p-10 rounded-4xl shadow-xl hover:shadow-lg transition-all duration-300"
          >
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <img
                src={item.iconUrl || item.icon}
                alt={item.title}
                className="w-12 h-12 object-contain"
              />
            </div>

            {/* Title */}
            <h3 className="font-bold text-sm tracking-wide mb-2">
              {item.title}
            </h3>

            {/* Description */}
            <p className="text-[#646464] text-sm leading-relaxed">
              {item.description || item.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}