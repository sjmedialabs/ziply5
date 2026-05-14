"use client"

import { useRouter } from "next/navigation"

type Props = {
  orderId: string
}

export function OrderHelpFooter({ orderId }: Props) {
  const router = useRouter()

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 text-center">
      <p className="text-sm font-semibold text-[#111827]">Need help with your order?</p>
      <p className="mt-1 text-xs text-[#6B7280]">Our support team is here to help.</p>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => router.push("/contact")}
          className="rounded-md border border-[#D1D5DB] px-3 py-1.5 text-xs font-medium text-[#111827] hover:bg-[#F9FAFB]"
        >
          Contact support
        </button>
        <button
          type="button"
          onClick={() => {
            const el = document.getElementById("shipment-tracking")
            el?.scrollIntoView({ behavior: "smooth", block: "start" })
          }}
          className="rounded-md bg-[#111827] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1f2937]"
        >
          Jump to tracking
        </button>
      </div>
      <p className="mt-2 text-[10px] text-[#9CA3AF]">Order ID: {orderId}</p>
    </div>
  )
}
