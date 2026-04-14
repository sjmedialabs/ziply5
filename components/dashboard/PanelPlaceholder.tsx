import type { ReactNode } from "react"

export function PanelPlaceholder({
  title,
  children,
}: {
  title: string
  children?: ReactNode
}) {
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-melon text-2xl font-bold tracking-wide text-[#4A1D1F] md:text-3xl">{title}</h1>
      <div className="mt-4 rounded-2xl border border-[#E8DCC8] bg-white p-5 shadow-sm text-sm text-[#646464] leading-relaxed">
        {children}
      </div>
    </div>
  )
}
