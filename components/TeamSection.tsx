"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import { ArrowLeft, ArrowRight, Facebook, Instagram, Youtube } from "lucide-react";

export function TeamSection({ data }: { data?: any }) {
    const defaultTeam = [
        {
            name: "Management-1",
            role: "Managing Director",
            img: "assets/AboutPage/team1.jpg",
            socials: {
                facebook: "#",
                instagram: "#",
                youtube: "#",
            },
        },
        {
            name: "Management-2",
            role: "Managing Director",
            img: "assets/AboutPage/team2.jpg",
            socials: {
                facebook: "#",
                instagram: "#",
                youtube: "#",
            },
        },
        {
            name: "Management-3",
            role: "Managing Director",
            img: "assets/AboutPage/team3.jpg",
            socials: {
                facebook: "#",
                instagram: "#",
                youtube: "#",
            },
        },
    ];

    const titleString = data?.title || "Our Team Members";
    const titleWords = titleString.split(" ");
    const firstWord = titleWords[0];
    const secondWord = titleWords[1];
    const restOfTitle = titleWords.slice(2).join(" ");

    const mainDescription = data?.mainDescription || "Get to know the friendly faces behind your favorite flavors.";
    const displayTeam = data?.members?.length > 0 ? data.members : defaultTeam;

    return (
        <section className="py-20 bg-[#A9E7FD] bg-[linear-gradient(to_left,#EFD7EF,#F5F9FC,#F8EAE1,#A9E7FD)] text-center">
            <div className="max-w-7xl mx-auto px-4">
                {/* Heading */}
                <div className="flex flex-col gap-2 w-full justify-center items-center">
                    <div className="flex flex-col gap-2 max-w-sm">
                        <h2 className="text-4xl font-melon font-medium tracking-wider leading-12 mb-2">
                            {firstWord} {secondWord && <span className="text-primary">{secondWord}</span>} {restOfTitle}
                        </h2>

                        <p className="text-[#646464] mb-12">
                            {mainDescription}
                        </p></div>
                </div>
                {/* Swiper */}
                <Swiper
                    modules={[Autoplay, Navigation]}
                    spaceBetween={30}
                    slidesPerView={3}
                    autoplay={{
                        delay: 2500,
                        disableOnInteraction: false,
                    }}
                    navigation={{
                        nextEl: ".custom-next",
                        prevEl: ".custom-prev",
                    }}
                    loop={true}
                    breakpoints={{
                        320: { slidesPerView: 1 },
                        640: { slidesPerView: 2 },
                        1024: { slidesPerView: 3 },
                    }}
                >
                    {displayTeam.map((member: any, i: number) => (
                        <SwiperSlide key={member.id || i}>
                            <div className="flex flex-col items-center">
                                {/* Image */}
                                <img
                                    src={member.imageUrl || member.img}
                                    alt={member.name}
                                    className="w-48 h-48 rounded-full object-cover mb-4"
                                />

                                {/* Name */}
                                <h3 className="font-semibold text-lg">
                                    {member.name}
                                </h3>

                                {/* Role */}
                                <p className="text-[#646464] text-sm mb-4">
                                    {member.role}
                                </p>

                                {/* Social Icons */}
                                <div className="flex gap-3">
                                    <a
                                        href={member.facebook || member.socials?.facebook || "#"}
                                        className="w-9 h-9 flex items-center justify-center rounded-full bg-[#7c2d12] text-white hover:scale-110 transition"
                                    >
                                        <Facebook size={14} />
                                    </a>

                                    <a
                                        href={member.instagram || member.socials?.instagram || "#"}
                                        className="w-9 h-9 flex items-center justify-center rounded-full bg-[#7c2d12] text-white hover:scale-110 transition"
                                    >
                                        <Instagram size={14} />
                                    </a>

                                    <a
                                        href={member.youtube || member.socials?.youtube || "#"}
                                        className="w-9 h-9 flex items-center justify-center rounded-full bg-[#7c2d12] text-white hover:scale-110 transition"
                                    >
                                        <Youtube size={14} />
                                    </a>
                                </div>
                            </div>
                        </SwiperSlide>
                    ))}
                                    <button className="custom-prev absolute top-1/2 left-0">
  <ArrowLeft size={18} />
</button>

<button className="custom-next absolute top-1/2 right-0">
  <ArrowRight size={18} />
</button>
                </Swiper>

            </div>
        </section>
    );
}