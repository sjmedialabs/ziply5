"use client";

import BannerSection from "@/components/BannerSection";
import { JourneySection } from "@/components/JourneySection";
import { MissionSection } from "@/components/MissionSection";
import { StatsSection } from "@/components/StatsSection";
import { TeamSection } from "@/components/TeamSection";
import { NewsletterSection } from "@/components/NewsletterSection";

export default function About() {
  return (
    <div>
      {/* HERO */}
      <BannerSection
        title="About Us"
        bgImage="/assets/AboutPage/aboutBanner.png"
        overlayColor="rgba(128,128,128,0.1)"
      />

      {/* SECTIONS */}
      <JourneySection />
      <MissionSection />
      <StatsSection />
      <TeamSection />
      <NewsletterSection />
    </div>
  );
}