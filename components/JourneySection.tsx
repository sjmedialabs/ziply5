export function JourneySection() {
    return (
        <section className="py-16 px-6 grid md:grid-cols-2 gap-10 items-center">
            <div className="flex justify-center">
                <img
                    src="/assets/Aboutpage/journyAbout.png"
                    className="lg:w-100 lg:h-100 h-full w-full rounded-full object-cover"
                />
            </div>

            <div className="max-w-md">
                <h2 className="text-4xl font-medium font-melon mb-4 tracking-wider leading-12">
                    Our <span className="text-primary">Journey</span> Began With a Simple Dream
                </h2>
                <p className="text-[#646464]">
                    Our goal is to make the best ice cream using only the finest,
                    natural ingredients. From rich, creamy classics to adventurous
                    new creations, every flavor is meticulously crafted in-house to
                    ensure the highest quality and freshness.
                </p><br />
                <p className="text-[#646464] lg:flex hidden">
                    We take pride in offering a diverse range of options, including
                    dairy-free, vegan, and gluten-free choices, so everyone can find
                    their perfect scoop.
                </p>
            </div>
        </section>
    );
}