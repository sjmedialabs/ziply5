import BannerSection from "@/components/BannerSection";
import { prisma } from "@/src/server/db/prisma";

export default async function PrivacyPolicyPage() {
  const page = await prisma.cmsPage.findUnique({
    where: { slug: "privacy" },
    include: { sections: true },
  });

  let privacyContent = page?.sections.find(s => s.sectionType === "privacy-content")?.contentJson?.content;

  // Treat empty Tiptap editor states as null so the fallback shows
  if (!privacyContent || privacyContent.trim() === "<p></p>" || privacyContent.trim() === "<p><br></p>") {
    privacyContent = null;
  }

  return (
    <div>
      <BannerSection
        title="Privacy Policy"
        subtitle="How ziply5 handles your information."
        gradient="linear-gradient(to right, #EFD7EF 0%, #F5F9FC 30%, #F8EAE1 60%, #EAF8F9 100%)"
      />

      <section className="py-16">
        <div className="mx-auto max-w-5xl px-4 space-y-6 text-[#646464]">
          {privacyContent && (
            <div 
              className="prose max-w-none text-black whitespace-pre-wrap [&_p]:min-h-[1.5rem]"
              dangerouslySetInnerHTML={{ __html: privacyContent }}
            />
          )}
        </div>
      </section>
    </div>
  );
}
