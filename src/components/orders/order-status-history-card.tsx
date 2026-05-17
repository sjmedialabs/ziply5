"use client"

import type { CustomerOrderDetail } from "@/src/lib/orders/customer-order-detail"

const pretty = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())

type Props = {
  statusHistory: CustomerOrderDetail["statusHistory"]
  className?: string
}

export function OrderStatusHistoryCard({ statusHistory, className = "" }: Props) {
  if (!statusHistory?.length) {
    return (
      <div className={`rounded-xl border border-[#E5E7EB] bg-white p-4 ${className}`}>
        <h2 className="mb-2 text-sm font-semibold text-[#111827]">Order status history</h2>
        <p className="text-sm text-[#6B7280]">No status changes recorded yet.</p>
      </div>
    )
  }

  return (
    <div className={`rounded-xl border border-[#E5E7EB] bg-white p-4 ${className}`}>
      <h2 className="mb-3 text-sm font-semibold text-[#111827]">Order status history</h2>
      <ul className="max-h-[min(24rem,50vh)] space-y-3 overflow-y-auto pr-1">
        {[...statusHistory]
          .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())
          .map((entry) => (
            <li key={`${entry.toStatus}-${entry.changedAt}`} className="border-l-2 border-[#22C55E] pl-3">
              <p className="text-sm font-medium text-[#111827]">{pretty(entry.toStatus)}</p>
              <p className="text-xs text-[#6B7280]">{new Date(entry.changedAt).toLocaleString("en-GB")}</p>
            </li>
          ))}
      </ul>
    </div>
  )
}
