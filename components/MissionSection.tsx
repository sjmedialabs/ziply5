export function MissionSection({ data }: { data?: any }) {
  const titleString = data?.title || "Our Mission is to Create Moments";

  const description = data?.description || "We strive to foster a welcoming and joyful environment where customers of all ages can gather, celebrate, and make lasting memories. Our commitment extends beyond serving great ice cream.";
  const imageUrl = data?.imageUrl || "assets/AboutPage/missionAbout.png";

  return (
    <section className="bg-[#7c2d12] text-white grid md:grid-cols-2 items-center">

      <div className="py-16 px-6 lg:ml-18 w-full h-full flex justify-center items-center">
        <div className="flex flex-col gap-6 justify-center items-center max-w-md">
          <h2 className="text-4xl font-medium font-melon mb-4 tracking-wider leading-12">
            {titleString}
          </h2>
          <p className="text-lg ">
            {description}
          </p>
        </div>
      </div>

      <div className="flex justify-center lg:ml-20">
        <img
          src={imageUrl}
          alt={titleString}
          className="w-full h-120 border-l-20 border-pink-400 rounded-l-full object-cover"
        />
      </div>
    </section>
  );
}