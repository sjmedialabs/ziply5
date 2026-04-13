"use client";

import BannerSection from "@/components/BannerSection";

export default function PrivacyPolicyPage() {
  return (
    <div>
      <BannerSection
        title="Privacy Policy"
        subtitle="How ziply5 handles your information."
        gradient="linear-gradient(to right, #EFD7EF 0%, #F5F9FC 30%, #F8EAE1 60%, #EAF8F9 100%)"
      />

      <section className="py-16">
        <div className="mx-auto max-w-5xl px-4 space-y-6 text-[#646464]">
          <p>
            At ziply5, we value your privacy. This page explains what information we collect, why we collect it, and
            how we use it when you browse our website or place an order.
          </p>

          <div>
            <h2 className="mb-2 text-lg font-semibold text-black">1. Information We Collect</h2>
            <p>
              We may collect your name, email, phone number, delivery address, and payment-related metadata to process
              orders and provide customer support.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-semibold text-black">2. How We Use Your Data</h2>
            <p>
              We use your data to fulfill orders, share order updates, improve user experience, and communicate important
              service messages.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-semibold text-black">3. Data Protection</h2>
            <p>
              We follow standard security practices to protect customer data. Sensitive payment details are handled via
              secure payment partners.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-semibold text-black">4. Marketing Communication</h2>
            <p>
              If you subscribe to updates, we may send promotional emails. You can unsubscribe anytime using the link in
              the email.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-semibold text-black">5. Contact</h2>
            <p>
              For privacy-related questions, reach us at <span className="font-medium text-black">support@ziply5.com</span>.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
