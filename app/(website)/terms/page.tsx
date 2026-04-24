import BannerSection from "@/components/BannerSection";
import { getCmsPageSafe } from "@/src/server/modules/cms/cms.safe";

export default async function TermsPage() {
  const page = await getCmsPageSafe("terms");

  const sectionData = page?.sections.find(s => s.sectionType === "terms-content")?.contentJson as any;
  let termsContent = sectionData?.content;

  // Treat empty Tiptap editor states as null so the fallback shows
  if (!termsContent || termsContent.trim() === "<p></p>" || termsContent.trim() === "<p><br></p>") {
    termsContent = null;
  }

  return (
    <div>
      <BannerSection
        title={sectionData?.title || "Terms & Conditions"}
        subtitle={sectionData?.description || "Please read the terms for using ziply5."}
        bgImage={sectionData?.bgImage}
        gradient="linear-gradient(to right, #EFD7EF 0%, #F5F9FC 30%, #F8EAE1 60%, #EAF8F9 100%)"
      />

      <section className="py-16">
        <div className="mx-auto max-w-5xl px-4 space-y-6 text-[#646464]">
          {termsContent && (
            <div 
              className="prose max-w-none text-black whitespace-pre-wrap [&_p]:min-h-[1.5rem]"
              dangerouslySetInnerHTML={{ __html: termsContent }}
            />
          )}
        </div>
      </section>
    </div>
  );
}