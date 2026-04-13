"use client";

import BannerSection from "@/components/BannerSection";

export default function ReturnsPage() {
  return (
    <div>
      <BannerSection
        title="Returns"
        subtitle="ziply5 returns and refund policy."
        gradient="linear-gradient(to right, #EFD7EF 0%, #F5F9FC 30%, #F8EAE1 60%, #EAF8F9 100%)"
      />

      <section className="py-16">
        <div className="mx-auto max-w-5xl px-4 space-y-6 text-[#646464]">
          <p>
            We are committed to delivering quality products. If there is an issue with your order, please contact us and
            we will help with the best possible resolution.
          </p>

          <div>
            <h2 className="mb-2 text-lg font-semibold text-black">1. Eligible Return Cases</h2>
            <p>
              You may request support for wrong item delivery, damaged package, spoiled product, or missing items in your
              order.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-semibold text-black">2. Return Request Window</h2>
            <p>
              Please raise the issue within 24 hours of receiving your order and share your order ID with photos if
              applicable.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-semibold text-black">3. Refund Process</h2>
            <p>
              Once verified, eligible refunds are processed to the original payment method. Timelines depend on your bank
              or payment provider.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-semibold text-black">4. Non-Returnable Cases</h2>
            <p>
              Opened or consumed products are generally non-returnable unless there is a quality issue reported within the
              support window.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
