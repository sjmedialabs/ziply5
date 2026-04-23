"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import { ArrowLeft, ArrowRight, Facebook, Instagram, Youtube } from "lucide-react";

export function TeamSection({ data }: { data?: any }) {
    const titleString = data?.title;
    const titleWords = titleString ? titleString.split(" ").filter(Boolean) : [];

    const mainDescription = data?.mainDescription;
    const displayTeam = data?.members || [];

    return (
        <section className="py-20 bg-[#A9E7FD] bg-[linear-gradient(to_left,#EFD7EF,#F5F9FC,#F8EAE1,#A9E7FD)] text-center">
            <div className="max-w-7xl mx-auto px-4">
                {/* Heading */}
                <div className="flex flex-col gap-2 w-full justify-center items-center">
                    <div className="flex flex-col gap-2 max-w-sm">
                        {titleString && (
                            <h2 className="text-4xl font-melon font-medium tracking-wider leading-12 mb-2">
                                {titleWords[0]} {titleWords[1] && <span className="text-primary">{titleWords[1]}</span>} {titleWords.slice(2).join(" ")}
                            </h2>
                        )}

                        {mainDescription && (
                            <p className="text-[#646464] mb-12">
                                {mainDescription}
                            </p>
                        )}
                    </div>
                </div>
                {/* Swiper */}
                {displayTeam.length > 0 && (
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
                                    {member.imageUrl && (
                                        <img
                                            src={member.imageUrl}
                                            alt={member.name}
                                            className="w-48 h-48 rounded-full object-cover mb-4"
                                        />
                                    )}

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
                                        {member.facebook && (
                                            <a
                                                href={member.facebook}
                                                className="w-9 h-9 flex items-center justify-center rounded-full bg-[#7c2d12] text-white hover:scale-110 transition"
                                            >
                                                <Facebook size={14} />
                                            </a>
                                        )}

                                        {member.instagram && (
                                            <a
                                                href={member.instagram}
                                                className="w-9 h-9 flex items-center justify-center rounded-full bg-[#7c2d12] text-white hover:scale-110 transition"
                                            >
                                                <Instagram size={14} />
                                            </a>
                                        )}

                                        {member.youtube && (
                                            <a
                                                href={member.youtube}
                                                className="w-9 h-9 flex items-center justify-center rounded-full bg-[#7c2d12] text-white hover:scale-110 transition"
                                            >
                                                <Youtube size={14} />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </SwiperSlide>
                        ))}
                        <button className="custom-prev absolute top-1/2 left-0 z-10">
                            <ArrowLeft size={18} />
                        </button>

                        <button className="custom-next absolute top-1/2 right-0 z-10">
                            <ArrowRight size={18} />
                        </button>
                    </Swiper>
                )}

            </div>
        </section>
    );
}