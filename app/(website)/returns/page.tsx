import BannerSection from "@/components/BannerSection";
import { getCmsPageSafe } from "@/src/server/modules/cms/cms.safe";

export default async function ReturnsPage() {
  const page = await getCmsPageSafe("returns");

  const sectionData = page?.sections.find(s => s.sectionType === "return-content")?.contentJson as any;
  let returnsContent = sectionData?.content;

  // Treat empty Tiptap editor states as null so the fallback shows
  if (!returnsContent || returnsContent.trim() === "<p></p>" || returnsContent.trim() === "<p><br></p>") {
    returnsContent = null;
  }

  return (
    <div>
      <BannerSection
        title={sectionData?.title || "Returns"}
        subtitle={sectionData?.description || "ziply5 returns and refund policy."}
        bgImage={sectionData?.bgImage}
        gradient="linear-gradient(to right, #EFD7EF 0%, #F5F9FC 30%, #F8EAE1 60%, #EAF8F9 100%)"
      />

      <section className="py-16">
        <div className="mx-auto max-w-5xl px-4 space-y-6 text-[#646464]">
          {returnsContent && (
            <div 
              className="prose max-w-none text-black whitespace-pre-wrap [&_p]:min-h-[1.5rem]"
              dangerouslySetInnerHTML={{ __html: returnsContent }}
            />
          )}
        </div>
      </section>
    </div>
  );
}
