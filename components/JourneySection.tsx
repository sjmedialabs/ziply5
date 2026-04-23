export function JourneySection({ data }: { data?: any }) {
    const titleString = data?.title;
    const titleWords = titleString ? titleString.split(" ").filter(Boolean) : [];
    
    const desc1 = data?.desc1;
    const desc2 = data?.desc2;
    const mediaUrl = data?.mediaUrl;
    
    // Safely check if the uploaded media is a video format (URL extension or base64)
    const isVideo = mediaUrl ? (mediaUrl.match(/\.(mp4|webm|ogg)$/i) || mediaUrl.startsWith('data:video/')) : false;

    return (
        <section className="py-16 px-6 grid md:grid-cols-2 gap-10 items-center">
            <div className="flex justify-center">
                {mediaUrl && (
                    isVideo ? (
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
                            alt={titleString || "Our Journey"}
                            className="lg:w-100 lg:h-100 h-[300px] w-[300px] lg:rounded-full object-cover"
                        />
                    )
                )}
            </div>

            <div className="max-w-md">
                {titleString && (
                    <h2 className="text-4xl font-medium font-melon mb-4 tracking-wider leading-12">
                        {titleWords[0]} {titleWords[1] && <span className="text-primary">{titleWords[1]}</span>} {titleWords.slice(2).join(" ")}
                    </h2>
                )}
                {desc1 && <p className="text-[#646464]">{desc1}</p>}
                {desc1 && desc2 && <br />}
                {desc2 && <p className="text-[#646464] lg:flex hidden">{desc2}</p>}
            </div>
        </section>
    );
}