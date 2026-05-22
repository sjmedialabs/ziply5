"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import AboutHero from "@/components/about/AboutHero";
import AboutWhoWeAre from "@/components/about/AboutWhoWeAre";
import AboutStory from "@/components/about/AboutStory";
import AboutFarmToPlate from "@/components/about/AboutFarmToPlate";
import AboutSpecialFeatures from "@/components/about/AboutSpecialFeatures";
import AboutSpeciality from "@/components/about/AboutSpeciality";
import AboutRiceRanges from "@/components/about/AboutRiceRanges";
import AboutWhyChooseUs from "@/components/about/AboutWhyChooseUs";

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
      <div className="flex h-[60vh] items-center justify-center bg-[#FFFBF3]">
        <Loader2 className="h-8 w-8 animate-spin text-[#4A1D1F]" />
      </div>
    );
  }

  // Helper to safely extract JSON content for specific sections
  const getSection = (type: string) =>
    cmsData?.sections?.find((s: any) => s.sectionType === type)?.contentJson || null;

  return (
    <div className="bg-[#FFFBF3] overflow-x-hidden min-h-screen">
      {/* 1. HERO SECTION */}
      <AboutHero data={getSection("about-hero")} />

      {/* 2. WHO WE ARE SECTION */}
      <AboutWhoWeAre data={getSection("about-who-we-are")} />

      {/* 3. OUR STORY SECTION */}
      <AboutStory data={getSection("about-story")} />

      {/* 4. FARM TO PLATE SECTION */}
      <AboutFarmToPlate data={getSection("about-farm-to-plate")} />

      {/* 5. WHAT MAKES US SPECIAL SECTION */}
      <AboutSpecialFeatures data={getSection("about-special-features")} />

      {/* 6. OUR SPECIALITY SECTION */}
      <AboutSpeciality data={getSection("about-specialities")} />

      {/* 7. OUR RICE RANGES SECTION */}
      <AboutRiceRanges data={getSection("about-rice-ranges")} />

      {/* 8. WHY CHOOSE US SECTION */}
      <AboutWhyChooseUs data={getSection("about-why-choose-us")} />
    </div>
  );
}