"use client"

import { useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Download } from "lucide-react"
import { toast } from "@/lib/toast"
import { generateInvoicePDF } from "@/lib/invoice"

type OrderDetail = {
  id: string
  status: string
  paymentMethod?: string | null
  paymentStatus?: string | null
  subtotal?: string | number
  tax?: string | number
  discount?: string | number
  shipping?: string | number
  total: string | number
  createdAt: string
  customerName?: string | null
  customerPhone?: string | null
  customerAddress?: string | null
  items: Array<{
    id: string
    quantity: number
    lineTotal?: string | number
    product?: { name?: string | null } | null
  }>
  statusHistory: Array<{ toStatus: string; changedAt: string }>
  shipments: Array<{ id: string; carrier: string | null; trackingNo: string | null; shipmentStatus: string; eta?: string | null }>
}

const TRACK_STEPS = ["pending", "confirmed", "shipped", "delivered"] as const

const pretty = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())

export default function TrackOrderPage() {
  const params = useParams() as { id?: string }
  const router = useRouter()

  const orderQuery = useQuery({
    queryKey: ["order-track", params.id],
    enabled: Boolean(params.id),
    queryFn: async () => {
      const token = window.localStorage.getItem("ziply5_access_token")
      if (!token) throw new Error("Please login to track your order.")
      const res = await fetch(`/api/v1/orders/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = (await res.json()) as { success?: boolean; message?: string; data?: OrderDetail }
      if (!res.ok || !payload.success || !payload.data) throw new Error(payload.message ?? "Unable to load tracking details.")
      return payload.data
    },
  })

  const order = orderQuery.data
  const firstShipment = order?.shipments?.[0]

  const reached = useMemo(() => {
    const set = new Set((order?.statusHistory ?? []).map((x) => x.toStatus.toLowerCase()))
    if (order?.status) set.add(order.status.toLowerCase())
    return set
  }, [order])

  const downloadInvoice = async () => {
    if (!order) return
    const success = await generateInvoicePDF({
      ...order,
      currency: "Rs.", // Default currency for this page
      subtotal: Number(order.total) * 0.95, // Mock subtotal
      tax: Number(order.total) * 0.05, // Mock tax
      discount: Number(order.total) * 0.1, // Mock discount
      shipping: Number(order.total) * 0.1, // Mock shipping
    } as any)
    
    if (success) {
      toast.success("Success", "Invoice downloaded as PDF")
    } else {
      toast.error("Error", "Failed to generate PDF invoice")
    }
  }

  return (
    <section className="mx-auto max-w-7xl space-y-4 px-4 py-6">
      <div className="flex items-start justify-between gap-2">
        <div className="text-center sm:text-left">
          <h1 className="text-2xl font-bold text-[#111827]">Track Your Order</h1>
          <p className="mt-1 text-sm text-[#6B7280]">Enter your order details to check current shipment status.</p>
        </div>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-[#D1D5DB] bg-white px-3 py-1.5 text-xs font-medium text-[#111827] hover:bg-[#F9FAFB]"
        >
          Back
        </button>
      </div>

      <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[#111827]">Order {order?.id ? `${order.id.slice(0, 12)}...` : "-"}</p>
            <p className="text-xs text-[#6B7280]">
              Placed on {order?.createdAt ? new Date(order.createdAt).toLocaleDateString("en-GB") : "-"}
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => void downloadInvoice()} 
              className="flex items-center gap-1.5 rounded-md border border-[#D1D5DB] px-3 py-1.5 text-xs font-medium text-[#111827] hover:bg-[#F9FAFB]"
            >
              <Download size={14} />
              Invoice
            </button>
            <button onClick={() => window.print()} className="rounded-md border border-[#D1D5DB] px-3 py-1.5 text-xs">
              Print
            </button>
          </div>
        </div>
      </div>

      {orderQuery.isLoading && <p className="text-sm text-[#6B7280]">Loading tracking details...</p>}
      {orderQuery.error && <p className="text-sm text-red-600">{orderQuery.error instanceof Error ? orderQuery.error.message : "Unable to load order."}</p>}

      {order && (
        <>
          {order.status.toLowerCase() === "cancelled" && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-center">
              <p className="text-sm font-bold text-red-600 uppercase tracking-wide">This order has been cancelled</p>
              <p className="text-xs text-red-500 mt-1">Tracking information is no longer active for this order.</p>
            </div>
          )}
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <p className="mb-3 text-sm font-semibold text-[#111827]">Delivery Progress</p>
            <div className="mb-4 h-1 w-full bg-[#E5E7EB]">
              <div
                className="h-1 bg-[#16A34A]"
                style={{
                  width: `${((TRACK_STEPS.findIndex((s) => s === (order.status.toLowerCase() as any)) + 1) / TRACK_STEPS.length) * 100}%`,
                }}
              />
            </div>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              {TRACK_STEPS.map((step) => (
                <div key={step}>
                  <div className={`mx-auto mb-1 h-5 w-5 rounded-full ${reached.has(step) ? "bg-[#16A34A]" : "bg-[#D1D5DB]"}`} />
                  <p className={reached.has(step) ? "font-semibold text-[#111827]" : "text-[#6B7280]"}>{pretty(step)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <p className="mb-3 text-sm font-semibold text-[#111827]">Order Timeline</p>
            <div className="space-y-3">
              {order.statusHistory.map((entry) => (
                <div key={`${entry.toStatus}-${entry.changedAt}`} className="border-l-2 border-[#22C55E] pl-3">
                  <p className="text-sm font-medium text-[#111827]">{pretty(entry.toStatus)}</p>
                  <p className="text-xs text-[#6B7280]">{new Date(entry.changedAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <p className="mb-3 text-sm font-semibold text-[#111827]">Tracking Information</p>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <p>Carrier: <span className="font-medium">{firstShipment?.carrier ?? "FedEx"}</span></p>
              <p>Tracking: <span className="font-medium">{firstShipment?.trackingNo ?? "Pending"}</span></p>
              <p>Status: <span className="font-medium">{pretty(firstShipment?.shipmentStatus ?? order.status)}</span></p>
              <p>ETA: <span className="font-medium">{firstShipment?.eta ? new Date(firstShipment.eta).toLocaleDateString("en-GB") : "TBD"}</span></p>
            </div>
          </div>

          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <p className="mb-3 text-sm font-semibold text-[#111827]">Order Items</p>
            <div className="space-y-2 text-sm">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between border-b border-[#F3F4F6] pb-2">
                  <p>{item.product?.name ?? "Product"} x {item.quantity}</p>
                  <p className="font-medium">Rs.{Number(item.lineTotal ?? 0).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 text-sm">
              <p className="mb-2 font-semibold text-[#111827]">Shipping Address</p>
              <p>{order.customerName ?? "-"}</p>
              <p className="text-[#6B7280]">{order.customerAddress ?? "-"}</p>
              <p className="text-[#6B7280]">{order.customerPhone ?? "-"}</p>
            </div>
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 text-sm">
              <p className="mb-2 font-semibold text-[#111827]">Payment Method</p>
              <p>{(order.paymentMethod ?? "Unknown").toUpperCase()}</p>
              <p className="text-[#6B7280]">Status: {(order.paymentStatus ?? "pending").toUpperCase()}</p>
              <p className="mt-2 font-semibold">Total: Rs.{Number(order.total).toFixed(2)}</p>
            </div>
          </div>

          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 text-center">
            <p className="text-sm font-semibold text-[#111827]">Need help with your order?</p>
            <p className="mt-1 text-xs text-[#6B7280]">Our support team is here to help.</p>
            <div className="mt-3 flex justify-center gap-2">
              <button onClick={() => router.push("/support")} className="rounded-md border border-[#D1D5DB] px-3 py-1.5 text-xs">
                Contact Support
              </button>
              <button onClick={() => router.push(`/orders/${order.id}`)} className="rounded-md bg-[#111827] px-3 py-1.5 text-xs text-white">
                View Order Details
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  )
}

