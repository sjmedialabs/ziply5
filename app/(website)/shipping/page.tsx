import BannerSection from "@/components/BannerSection";
import { prisma } from "@/src/server/db/prisma";

export default async function ShippingInfoPage() {
  const page = await prisma.cmsPage.findUnique({
    where: { slug: "shipping" },
    include: { sections: true },
  });

  const sectionData = page?.sections.find(s => s.sectionType === "shipping-content")?.contentJson as any;
  let shippingContent = sectionData?.content;

  // Treat empty Tiptap editor states as null so the fallback shows
  if (!shippingContent || shippingContent.trim() === "<p></p>" || shippingContent.trim() === "<p><br></p>") {
    shippingContent = null;
  }

  return (
    <div>
      <BannerSection
        title={sectionData?.title || "Shipping Info"}
        subtitle={sectionData?.description || "Delivery timelines and shipping details."}
        bgImage={sectionData?.bgImage}
        gradient="linear-gradient(to right, #EFD7EF 0%, #F5F9FC 30%, #F8EAE1 60%, #EAF8F9 100%)"
      />

      <section className="py-16">
        <div className="mx-auto max-w-5xl px-4 space-y-6 text-[#646464]">
          {shippingContent && (
            <div 
              className="prose max-w-none text-black whitespace-pre-wrap [&_p]:min-h-[1.5rem]"
              dangerouslySetInnerHTML={{ __html: shippingContent }}
            />
          )}
        </div>
      </section>
    </div>
  );
}
