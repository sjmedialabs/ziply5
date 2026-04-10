import Link from "next/link"

interface SectionHeaderProps {
  title: string
  linkHref?: string
  linkText?: string
}

export default function SectionHeader({ title, linkHref, linkText = "view all" }: SectionHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-4 mb-8">
      <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#51282B] tracking-wide text-center sm:text-left">
        {title}
      </h2>
     
      {linkHref && (
         <div>
        <Link
          href={linkHref}
          className="flex items-center gap-2 bg-[#51282B] text-white px-2 py-3 rounded-lg font-bold text-[14px] hover:bg-[#3a1517] transition-colors"
        >
          {linkText}
          <span className="w-5 h-5 rounded-full border border-white bg-white text-primary flex items-center justify-center">
            <svg className="w-3 h-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </Link>
        </div>
      )}
    </div>
  )
}