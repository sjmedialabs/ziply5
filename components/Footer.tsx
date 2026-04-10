"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "./ui/button";

/* ===============================
   Static Navigation Links
================================ */

const ABOUT_LINKS = [
  { label: "About ziply5", href: "/about" },
  { label: "Special Dish", href: "/special-dish" },
  { label: "Book now", href: "/book" },
  { label: "Contact", href: "/contact" },
];

const MENU_LINKS = [
  { label: "Ready-to-Eat Meals", href: "/menu/ready-to-eat" },
  { label: "Ready-to-Cook", href: "/menu/ready-to-cook" },
  { label: "Veg", href: "/menu/veg" },
  { label: "Non-veg", href: "/menu/non-veg" },
  { label: "Combo packs", href: "/menu/combos" },
];

const QUICK_LINKS = [
  { label: "About ziply5", href: "/about" },
  { label: "Special Dish", href: "/special-dish" },
  { label: "Book now", href: "/book" },
  { label: "Contact", href: "/contact" },
];

/* ===============================
   CMS Fallback Data
================================ */

const fallbackCMSData = {
  logo: "/footerLogo.png",

  timings: "Monday - Sunday:\n10:00am - 23:00pm",

  phone: "+91 9901233213",

  email: "support@ziply5.com",

  socialLinks: [
    { name: "linkedin", url: "#" },
    { name: "twitter", url: "#" },
    { name: "facebook", url: "#" },
    { name: "youtube", url: "#" },
  ],
};

export default function Footer() {
  const cmsData = fallbackCMSData;

  return (
    <footer className="relative overflow-hidden">

      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('/footerBackground.png')",
        }}
      />

      {/* Overlay Layer */}
      <div className="absolute inset-0 bg-[#5ECFDB]/50" />

      {/* Content Layer */}
      <div className="relative z-10 pt-6">

        <div className="max-w-7xl mx-auto px-6 lg:px-8">

          {/* Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-5 lg:gap-10">

            {/* Contact Card */}
            <div className="col-span-2 sm:col-span-1 lg:col-span-1">
              <div className="bg-yellow-400 rounded-2xl p-5 text-[#4A1D1F]">

                {/* Logo as styled text */}
                <Image
                  src="/footerLogo.png"
                  alt="Ziply5 Logo"
                  width={140}
                  height={60}
                  className="mb-4 object-contain"
                />

                {/* Timings */}
                <p className="text-sm font-medium leading-snug mb-4 text-[#4A1D1F]">
                  Monday – Sunday:<br />
                  {cmsData?.timings.split("\n")[1] ?? "10:00am – 23:00pm"}
                </p>

                {/* Phone */}
                <p className="font-extrabold text-sm text-[#4A1D1F] leading-snug">
                  {cmsData?.phone || "91 9901233213"}
                </p>

                {/* Email */}
                <p className="font-extrabold text-sm text-[#4A1D1F] leading-snug mb-5">
                  {cmsData?.email || "support@ziply5.com"}
                </p>

                {/* Social Icons — white circle buttons with real SVGs */}
                <div className="flex gap-2.5">
                  {/* LinkedIn */}
                  <a href="#" aria-label="LinkedIn"
                    className="w-9 h-9 bg-white rounded-full flex items-center justify-center  transition-colors">
                    <svg className="w-4 h-4 text-[#4A1D1F]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  </a>
                  {/* Twitter / X */}
                  <a href="#" aria-label="Twitter"
                    className="w-9 h-9 bg-white rounded-full flex items-center justify-center  transition-colors">
                    <svg className="w-4 h-4 text-[#4A1D1F]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                    </svg>
                  </a>
                  {/* Facebook */}
                  <a href="#" aria-label="Facebook"
                    className="w-9 h-9 bg-white rounded-full flex items-center justify-center  transition-colors">
                    <svg className="w-4 h-4 text-[#4A1D1F]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </a>
                  {/* YouTube */}
                  <a href="#" aria-label="YouTube"
                    className="w-9 h-9 bg-white rounded-full flex items-center justify-center  transition-colors">
                    <svg className="w-4 h-4 text-[#4A1D1F]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                  </a>
                </div>

              </div>
            </div>


            <FooterColumn
              title="About"
              links={ABOUT_LINKS}
            />

            <FooterColumn
              title="Menu"
              links={MENU_LINKS}
            />

            <FooterColumn
              title="Quick Links"
              links={QUICK_LINKS}
            />

            {/* Newsletter */}
            <div>

              <SectionTitle title="Newsletter" />

              <p className="text-sm text-[var(--primary-color)] mb-4">
                Get recent news and updates.
              </p>

              <input
                type="email"
                placeholder="Email Address"
                className="w-full bg-white rounded-lg px-4 py-3 text-sm mb-1 outline-none"
              />

              {/* Double Border Button */}
              <Button className="relative cursor-pointer bg-white h-[40px] rounded-lg font-semibold text-[var(--primary-color)] border-2 border-yellow-400 hover:bg-yellow-400 transition">

                {/* <span className="absolute inset-1 border border-yellow-400 rounded-lg"></span> */}

                <span className="relative">
                  Subscribe
                </span>

              </Button>

            </div>

          </div>

          {/* Bottom Section */}

          <div className="mt-5">

            {/* Yellow Line */}
            <div className="h-[2px] bg-yellow-400 w-full max-w-5xl mx-auto" />

            <p className="text-center text-sm text-white font-semibold my-2">
              © {cmsData?.copyWrightMsg || "2025 ziply5 All Rights Reserved"}
            </p>

          </div>

        </div>

      </div>

    </footer>
  );
}

/* ===============================
   Column Component
================================ */

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>

      <SectionTitle title={title} />

      <ul className="space-y-3">

        {links.map((link, index) => (

          <li key={index}>

            <Link
              href={link.href}
              className="flex items-center gap-2 text-[var(--primary-color)] hover:text-yellow-400 transition text-xs"
            >

              <span className="text-yellow-400">
                ›
              </span>

              {link.label}

            </Link>

          </li>

        ))}

      </ul>

    </div>
  );
}

/* ===============================
   Section Title
================================ */

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="mb-3">

      <h4 className="text-xl font-bold text-white">
        {title}
      </h4>

      {/* Yellow Underline */}
      <div className="w-12 h-[4px] bg-yellow-400  rounded" />

    </div>
  );
}