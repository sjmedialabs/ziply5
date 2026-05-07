import BannerSection from "@/components/BannerSection";
import { getCmsPageSafe } from "@/src/server/modules/cms/cms.safe";

export default async function PrivacyPolicyPage() {
  const page = await getCmsPageSafe("privacy");

  const sectionData = page?.sections.find(s => s.sectionType === "privacy-content")?.contentJson as any;
  let privacyContent = sectionData?.content;

  // Treat empty Tiptap/Quill editor states as null
  if (
    !privacyContent ||
    privacyContent.trim() === "<p></p>" ||
    privacyContent.trim() === "<p><br></p>"
  ) {
    privacyContent = null;
  }

  if (privacyContent) {
  privacyContent = privacyContent
    // Convert multiple <br> into empty paragraph (real spacing)
    .replace(/(<br\s*\/?>\s*){2,}/g, "</p><p>&nbsp;</p><p>")

    // Convert single trailing <br> inside <p> to spacing
    .replace(/<p>(.*?)<br\s*\/?><\/p>/g, "<p>$1</p><p>&nbsp;</p>")

    // Fix empty paragraphs
    .replace(/<p><br><\/p>/g, "<p>&nbsp;</p>")
    .replace(/<p>\s*<\/p>/g, "<p>&nbsp;</p>");
}
console.log("Privacy Content:", privacyContent);
  return (
    <div>
      <BannerSection
        title={sectionData?.title || "Privacy Policy"}
        subtitle={sectionData?.description || "How ziply5 handles your information."}
        bgImage={sectionData?.bgImage}
        gradient="linear-gradient(to right, #EFD7EF 0%, #F5F9FC 30%, #F8EAE1 60%, #EAF8F9 100%)"
      />

      <section className="py-16">
        <div className="mx-auto max-w-5xl px-4 space-y-6 text-[#646464]">
          {privacyContent && (
          <div
  className="prose max-w-none text-black whitespace-pre-wrap break-words"
  dangerouslySetInnerHTML={{ __html: privacyContent }}
/>
          )}
        </div>
      </section>
    </div>
  );
}