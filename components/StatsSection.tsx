export function StatsSection() {
  const stats = [
    {
      title: "ZERO PRESERVATIVES",
      desc: "Delight your guests with our flavors and  presentation",
      icon: "assets/AboutPage/FruitIcon.png",
    },
    {
      title: "99% MICROBE-FREE",
      desc: "We deliver your order promptly to your door",
      icon: "assets/AboutPage/timeIcon.png",
    },
    {
      title: "EASY RETURNS",
      desc: "Explore menu & order with ease using our Online Ordering ",
      icon: "assets/AboutPage/shoppinIcon.png",
    },
    {
      title: "FREE SHIPPING",
      desc: "Give the gift of exceptional dining with Foodi Gift Cards",
      icon: "assets/AboutPage/giftIcon.png",
    },
  ];

  return (
    <section className="py-20 text-center">

      {/* Heading */}
      <div className=" max-w-sm mx-auto ">
      <h2 className="text-4xl font-bold mb-2 font-melon tracking-wider leading-12">
        Our <span className="text-primary">Statistics</span>
      </h2>
      <p className="text-[#646464] mb-12">
        What makes us special through our impressive statistics.
      </p>
        </div>
      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 px-6 max-w-6xl mx-auto">
        {stats.map((item, i) => (
          <div
            key={i}
            className="bg-white p-10 rounded-4xl shadow-xl hover:shadow-lg transition-all duration-300"
          >
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <img
                src={item.icon}
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
              {item.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}