export function JourneySection({ data }: { data?: any }) {
    const titleString = data?.title || "Our Journey Began With a Simple Dream";
    const titleWords = titleString.split(" ");
    const firstWord = titleWords[0];
    const secondWord = titleWords[1];
    const restOfTitle = titleWords.slice(2).join(" ");
    
    const desc1 = data?.desc1 || "Our goal is to make the best ice cream using only the finest, natural ingredients. From rich, creamy classics to adventurous new creations, every flavor is meticulously crafted in-house to ensure the highest quality and freshness.";
    const desc2 = data?.desc2 || "We take pride in offering a diverse range of options, including dairy-free, vegan, and gluten-free choices, so everyone can find their perfect scoop.";
    const mediaUrl = data?.mediaUrl || "/assets/Aboutpage/journyAbout.png";
    
    // Check if the uploaded media is a video format
    const isVideo = mediaUrl.match(/\.(mp4|webm|ogg)$/i);

    return (
        <section className="py-16 px-6 grid md:grid-cols-2 gap-10 items-center">
            <div className="flex justify-center">
                {isVideo ? (
                    <video
                        src={mediaUrl}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="lg:w-100 lg:h-100 h-[300px] w-[300px] lg:rounded-full object-cover"
                    />
                ) : (
                    <img
                        src={mediaUrl}
                        alt="Our Journey"
                        className="lg:w-100 lg:h-100 h-[300px] w-[300px] lg:rounded-full object-cover"
                    />
                )}
            </div>

            <div className="max-w-md">
                <h2 className="text-4xl font-medium font-melon mb-4 tracking-wider leading-12">
                    {firstWord} {secondWord && <span className="text-primary">{secondWord}</span>} {restOfTitle}
                </h2>
                <p className="text-[#646464]">{desc1}</p><br />
                <p className="text-[#646464] lg:flex hidden">{desc2}</p>
            </div>
        </section>
    );
}