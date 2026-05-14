"use client"

import type { ReactNode } from "react"
import { Download } from "lucide-react"
import type { CustomerOrderDetail } from "@/src/lib/orders/customer-order-detail"

type Props = {
  order: CustomerOrderDetail
  paymentStatus: string
  onDownloadInvoice: () => void
  extraActions?: ReactNode
}

export function OrderSummaryHeroCard({ order, paymentStatus, onDownloadInvoice, extraActions }: Props) {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">Order ID</p>
          <p className="font-mono text-sm font-semibold text-[#111827] break-all" title={order.id}>
            {order.id}
          </p>
          <p className="mt-1 text-xs text-[#6B7280]">
            Placed on {new Date(order.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
          </p>
          <p className="mt-2 text-sm text-[#374151]">
            Payment: <span className="font-semibold uppercase">{paymentStatus}</span>
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#F3F4F6] px-3 py-1 text-[11px] font-semibold uppercase text-[#374151] ring-1 ring-[#E5E7EB]">
            {order.status}
          </span>
          <button
            type="button"
            onClick={() => void onDownloadInvoice()}
            className="flex items-center gap-1.5 rounded-md border border-[#D1D5DB] bg-white px-3 py-1.5 text-xs font-medium text-[#111827] hover:bg-[#F9FAFB]"
          >
            <Download size={14} />
            Invoice
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-md border border-[#D1D5DB] bg-white px-3 py-1.5 text-xs font-medium text-[#111827] hover:bg-[#F9FAFB]"
          >
            Print
          </button>
        </div>
      </div>
      {extraActions ? <div className="mt-4 flex flex-wrap gap-2 border-t border-[#F3F4F6] pt-4">{extraActions}</div> : null}
    </div>
  )
}
