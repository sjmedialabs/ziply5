"use client";

import BannerSection from "@/components/BannerSection";

export default function TermsPage() {
  return (
    <div>

      {/* Banner */}
      <BannerSection
        title="Terms & Conditions"
        subtitle="Some of the queries you want to know about us."
        gradient="linear-gradient(to right, #EFD7EF 0%, #F5F9FC 30%, #F8EAE1 60%, #EAF8F9 100%)"
      />

      {/* Content */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">

          {/* Title */}
          <h2 className="text-xl md:text-2xl font-semibold text-black mb-4">
            Terms and Conditions:
          </h2>

          {/* Intro */}
          <p className="text-[#646464] mb-6 leading-relaxed">
            Welcome to [Your Online Education Platform]! Before accessing or using our website,
            please read these Terms and Conditions carefully. By accessing or using any part of
            the site, you agree to be bound by these Terms and Conditions.
          </p>

          {/* Section 1 */}
          <div className="mb-6">
            <h3 className="font-semibold text-black mb-1">
              1. Use of Website:
            </h3>
            <p className="text-[#646464]">
              Your use of our website is subject to these Terms and Conditions. You must be at
              least 18 years old to use our services.
            </p>
          </div>

          {/* Section 2 */}
          <div className="mb-6">
            <h3 className="font-semibold text-black mb-1">
              2. User Account:
            </h3>
            <p className="text-[#646464]">
              You are responsible for maintaining the confidentiality of your account and password.
              You agree to provide accurate and complete information when creating an account.
            </p>
          </div>

          {/* Section 3 */}
          <div className="mb-6">
            <h3 className="font-semibold text-black mb-1">
              3. Intellectual Property:
            </h3>
            <p className="text-[#646464]">
              All content on this website, including text, graphics, logos, and images, is the
              property of [Your Platform] and protected by copyright laws. You may not reproduce,
              distribute, or transmit any content without prior written consent.
            </p>
          </div>

          {/* Section 4 */}
          <div className="mb-6">
            <h3 className="font-semibold text-black mb-1">
              4. Payment and Billing:
            </h3>
            <p className="text-[#646464]">
              Payment for our services is required in advance. All fees are non-refundable.
            </p>
          </div>

          {/* Section 5 */}
          <div className="mb-6">
            <h3 className="font-semibold text-black mb-1">
              5. Termination:
            </h3>
            <p className="text-[#646464] leading-relaxed">
              We reserve the right to suspend or terminate your account at any time for violation
              of these Terms and Conditions. Please review our full Terms and Conditions for more
              detailed information. You have the right to access, update, or delete your personal
              information at any time. You can opt out of receiving promotional emails by following
              the instructions provided in the email.
            </p>
          </div>

          {/* Footer Note */}
          <p className="text-black font-medium mt-8">
            Please review our full Terms and Conditions for more detailed information.
          </p>

        </div>
      </section>
    </div>
  );
}