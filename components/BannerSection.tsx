"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

type BannerProps = {
  title?: string;
  subtitle?: string;
  bgImage?: string;
  bgColor?: string;
  overlayColor?: string;
};

export default function BannerSection({
  title,
  subtitle,
  bgImage,
  bgColor = "#000",
  overlayColor = "rgba(0,0,0,0.5)",
}: BannerProps) {
  const pathname = usePathname();

  // Convert path → segments
  const pathSegments = pathname.split("/").filter(Boolean);

  // Helper: format text
  const formatLabel = (text: string) =>
    text.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <section
      className="relative w-full flex items-center justify-center text-white h-[70vh]"
      style={{
        background: bgImage
          ? `url(${bgImage}) center/cover no-repeat`
          : bgColor,
      }}
    >
      {/* Overlay */}
      {bgImage && (
        <div
          className="absolute inset-0"
          style={{ background: overlayColor }}
        />
      )}

      <div className="relative z-10 text-center max-w-7xl mx-auto px-4 flex flex-col items-center justify-center gap-2">
        <div>
        {title && (
          <h1 className="3xl md:5xl lg:text-7xl font-bold font-melon tracking-wider">{title}</h1>
        )}

        {subtitle && <p className="mt-2">{subtitle}</p>}
           </div>
        {/* ✅ Auto Breadcrumb */}
        <div className="mt-4 flex items-center justify-center gap-2 text-sm bg-white text-black px-8 py-2 rounded-full">
          <Link href="/" className="hover:text-orange-500">
            Home
          </Link>

          {pathSegments.map((segment, index) => {
            const href = "/" + pathSegments.slice(0, index + 1).join("/");
            const isLast = index === pathSegments.length - 1;

            return (
              <span key={href} className="flex items-center gap-2">
                <span>/</span>

                {isLast ? (
                  <span className="text-orange-500 font-medium">
                    {formatLabel(segment)}
                  </span>
                ) : (
                  <Link
                    href={href}
                    className="hover:text-orange-500"
                  >
                    {formatLabel(segment)}
                  </Link>
                )}
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}