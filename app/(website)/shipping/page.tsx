import BannerSection from "@/components/BannerSection";
import { prisma } from "@/src/server/db/prisma";

export default async function ShippingInfoPage() {
  const page = await prisma.cmsPage.findUnique({
    where: { slug: "shipping" },
    include: { sections: true },
  });

  let shippingContent = page?.sections.find(s => s.sectionType === "shipping-content")?.contentJson?.content;

  // Treat empty Tiptap editor states as null so the fallback shows
  if (!shippingContent || shippingContent.trim() === "<p></p>" || shippingContent.trim() === "<p><br></p>") {
    shippingContent = null;
  }

  return (
    <div>
      <BannerSection
        title="Shipping Info"
        subtitle="Delivery timelines and shipping details."
        gradient="linear-gradient(to right, #EFD7EF 0%, #F5F9FC 30%, #F8EAE1 60%, #EAF8F9 100%)"
      />

      <section className="py-16">
        <div className="mx-auto max-w-5xl px-4 space-y-6 text-[#646464]">
          {shippingContent ? (
            <div 
              className="prose max-w-none text-black"
              dangerouslySetInnerHTML={{ __html: shippingContent }}
            />
          ) : (
            <>
              <p>
                ziply5 ships across supported regions with reliable delivery partners. Shipping details shown at checkout are
                based on your location and order value.
              </p>

              <div>
                <h2 className="mb-2 text-lg font-semibold text-black">1. Delivery Coverage</h2>
                <p>
                  We currently deliver to selected cities and pin codes. Serviceability is confirmed at checkout.
                </p>
              </div>

              <div>
                <h2 className="mb-2 text-lg font-semibold text-black">2. Estimated Delivery Time</h2>
                <p>
                  Orders are typically delivered within 2-5 business days depending on destination and partner availability.
                </p>
              </div>

              <div>
                <h2 className="mb-2 text-lg font-semibold text-black">3. Shipping Charges</h2>
                <p>
                  Shipping charges are calculated at checkout. Promotions such as free shipping may apply based on cart value.
                </p>
              </div>

              <div>
                <h2 className="mb-2 text-lg font-semibold text-black">4. Order Tracking</h2>
                <p>
                  After dispatch, you receive tracking details by email or SMS so you can monitor delivery status.
                </p>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
