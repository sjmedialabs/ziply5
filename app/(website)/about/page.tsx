"use client";

import { useEffect, useState } from "react";
import BannerSection from "@/components/BannerSection";
import { JourneySection } from "@/components/JourneySection";
import { MissionSection } from "@/components/MissionSection";
import { StatsSection } from "@/components/StatsSection";
import { TeamSection } from "@/components/TeamSection";
import { NewsletterSection } from "@/components/NewsletterSection";
import { Loader2 } from "lucide-react";

export default function About() {
  const [cmsData, setCmsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCmsData = async () => {
      try {
        const res = await fetch("/api/v1/cms/pages?slug=about");
        const json = await res.json();
        setCmsData(json.data);
      } catch (error) {
        console.error("Failed to fetch about page CMS data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCmsData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#4A1D1F]" />
      </div>
    );
  }

  // Helper to safely extract JSON content for specific sections
  const getSection = (type: string) => cmsData?.sections?.find((s: any) => s.sectionType === type)?.contentJson || {};

  return (
    <div>
      {/* HERO */}
      <BannerSection
        title={cmsData?.title || "About Us"}
        bgImage="/assets/AboutPage/aboutBanner.png"
        overlayColor="rgba(128,128,128,0.1)"
      />

      {/* SECTIONS */}
      <JourneySection data={getSection('about-journey')} />
      <MissionSection data={getSection('about-mission')} />
      <StatsSection data={getSection('about-stats')} />
      <TeamSection data={getSection('about-team')} />
      <NewsletterSection data={getSection('about-subscription')} />
    </div>
  );
}