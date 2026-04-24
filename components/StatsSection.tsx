export function StatsSection({ data }: { data?: any }) {
  const titleString = data?.title;
  const titleWords = titleString ? titleString.split(" ").filter(Boolean) : [];
  const mainDescription = data?.mainDescription;
  const displayStats = data?.stats || [];

  return (
    <section className="py-20 text-center">

      {/* Heading */}
      <div className=" max-w-sm mx-auto ">
      {titleString && (
        <h2 className="text-4xl font-bold mb-2 font-melon tracking-wider leading-12">
          {titleWords[0]} {titleWords[1] && <span className="text-primary">{titleWords[1]}</span>} {titleWords.slice(2).join(" ")}
        </h2>
      )}
      {mainDescription && (
        <p className="text-[#646464] mb-12">
          {mainDescription}
        </p>
      )}
      </div>

      {/* Cards */}
      {displayStats.length > 0 && (
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
      )}
    </section>
  );
}