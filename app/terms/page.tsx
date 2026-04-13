"use client";

import BannerSection from "@/components/BannerSection";

export default function TermsPage() {
  return (
    <div>
      <BannerSection
        title="Terms & Conditions"
        subtitle="Please read the terms for using ziply5."
        gradient="linear-gradient(to right, #EFD7EF 0%, #F5F9FC 30%, #F8EAE1 60%, #EAF8F9 100%)"
      />

      <section className="py-16">
        <div className="mx-auto max-w-5xl px-4 space-y-6 text-[#646464]">
          <p>
            By using ziply5, you agree to these terms. Please review them before placing any order on our platform.
          </p>

          <div className="mb-6">
            <h3 className="mb-1 font-semibold text-black">1. Use of Website</h3>
            <p className="text-[#646464]">
              You agree to use this website for lawful purposes only and provide accurate details during signup and
              checkout.
            </p>
          </div>

          <div className="mb-6">
            <h3 className="mb-1 font-semibold text-black">2. Orders and Payments</h3>
            <p className="text-[#646464]">
              Orders are confirmed only after successful payment or approved cash-on-delivery selection. Prices and
              availability may change without prior notice.
            </p>
          </div>

          <div className="mb-6">
            <h3 className="mb-1 font-semibold text-black">3. Product and Delivery</h3>
            <p className="text-[#646464]">
              Delivery timelines are estimates and can vary based on location and logistics. Please review shipping and
              returns pages for detailed policies.
            </p>
          </div>

          <div className="mb-6">
            <h3 className="mb-1 font-semibold text-black">4. Intellectual Property</h3>
            <p className="text-[#646464]">
              All website content, branding, logos, and product assets are owned by ziply5 and may not be reused
              without permission.
            </p>
          </div>

          <div className="mb-6">
            <h3 className="mb-1 font-semibold text-black">5. Updates to Terms</h3>
            <p className="text-[#646464] leading-relaxed">
              We may update these terms from time to time. Continued use of the website after updates means you accept
              the revised terms.
            </p>
          </div>

          <p className="text-black font-medium mt-8">
            Need help? Contact us at support@ziply5.com.
          </p>
        </div>
      </section>
    </div>
  );
}