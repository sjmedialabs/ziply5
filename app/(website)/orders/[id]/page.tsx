"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRealtimeTables } from "@/hooks/useRealtimeTables"
import { useMasterValues } from "@/hooks/useMasterData"

type OrderDetail = {
  id: string
  status: string
  paymentStatus?: string | null
  currency: string
  subtotal?: string | number
  shipping?: string | number
  total: string | number
  createdAt: string
  deliveredAt?: string | null
  customerName?: string | null
  customerPhone?: string | null
  customerAddress?: string | null
  user?: { email?: string | null } | null
  items: Array<{
    id: string
    productId?: string
    quantity: number
    unitPrice?: string | number
    lineTotal?: string | number
    product?: { name?: string | null } | null
  }>
  statusHistory: Array<{ toStatus: string; changedAt: string }>
  transactions: Array<{ id: string; status: string; gateway: string; createdAt: string }>
  shipments: Array<{ id: string; carrier: string | null; trackingNo: string | null; shipmentStatus: string; eta?: string | null }>
  returnRequests: Array<{ id: string; status: string; reason: string | null }>
  refunds: Array<{ id: string; status: string; amount: string | number; createdAt: string }>
}

const FALLBACK_TIMELINE = [
  "pending_payment",
  "payment_success",
  "admin_approval_pending",
  "confirmed",
  "packed",
  "shipped",
  "delivered",
  "return_requested",
  "refund_initiated",
  "returned",
] as const
const FALLBACK_RETURN_REASONS = [
  "Damaged",
  "Wrong item",
  "Quality issue",
  "Late delivery",
  "Customer remorse",
  "Other",
] as const

export default function OrderDetailPage() {
  const params = useParams() as { id?: string }
  const router = useRouter()
  const queryClient = useQueryClient()
  const statusMasterQuery = useMasterValues("ORDER_STATUS")
  const returnReasonMasterQuery = useMasterValues("RETURN_REASON")
  const timeline = statusMasterQuery.data?.map((item) => item.value) ?? FALLBACK_TIMELINE
  const returnReasons = (returnReasonMasterQuery.data?.map((item) => item.label) ?? [...FALLBACK_RETURN_REASONS]) as string[]
  const [reason, setReason] = useState<string>((returnReasons[0] as string) ?? "Other")
  const [description, setDescription] = useState("")
  const [showReturnForm, setShowReturnForm] = useState(false)
  const [actionBusy, setActionBusy] = useState<string | null>(null)
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, { rating: number; content: string }>>({})
  const [existingReviewedProducts, setExistingReviewedProducts] = useState<Set<string>>(new Set())
  const [reviewBusyByProduct, setReviewBusyByProduct] = useState<Record<string, boolean>>({})

  const orderQuery = useQuery({
    queryKey: ["order-detail", params.id],
    enabled: Boolean(params.id),
    queryFn: async () => {
      const token = window.localStorage.getItem("ziply5_access_token")
      if (!token) throw new Error("Please login to view order details.")
      const res = await fetch(`/api/v1/orders/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = (await res.json()) as { success?: boolean; message?: string; data?: OrderDetail }
      if (!res.ok || !payload.success || !payload.data) throw new Error(payload.message ?? "Unable to load order.")
      return payload.data
    },
  })

  const returnMutation = useMutation({
    mutationFn: async () => {
      if (!params.id) throw new Error("Order missing")
      const token = window.localStorage.getItem("ziply5_access_token")
      if (!token) throw new Error("Please login to request a return.")
      const res = await fetch("/api/returns/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orderId: params.id, reason, description }),
      })
      const payload = (await res.json()) as { success?: boolean; message?: string }
      if (!res.ok || payload.success === false) throw new Error(payload.message ?? "Unable to request return.")
    },
    onSuccess: async () => {
      setShowReturnForm(false)
      await queryClient.invalidateQueries({ queryKey: ["order-detail", params.id] })
    },
  })

  const statusActionMutation = useMutation({
    mutationFn: async (action: "cancel_request" | "return_request") => {
      if (!params.id) throw new Error("Order missing")
      const token = window.localStorage.getItem("ziply5_access_token")
      if (!token) throw new Error("Please login to continue.")
      const res = await fetch(`/api/v1/orders/${params.id}/actions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      })
      const payload = (await res.json()) as { success?: boolean; message?: string }
      if (!res.ok || payload.success === false) throw new Error(payload.message ?? "Request failed")
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["order-detail", params.id] })
    },
  })

  useRealtimeTables({
    tables: ["orders", "returns", "refunds"],
    onChange: () => {
      if (params.id) {
        void queryClient.invalidateQueries({ queryKey: ["order-detail", params.id] })
      }
    },
  })

  const order = orderQuery.data
  const historySet = useMemo(() => new Set(order?.statusHistory.map((entry) => entry.toStatus.toLowerCase())), [order?.statusHistory])
  const returnExists = Boolean(order?.returnRequests?.length)
  const cancelRequested = historySet.has("cancel_requested")
  const returnRequested = historySet.has("return_requested")
  const paymentStatus =
    order?.paymentStatus ??
    (order?.transactions.some((tx) => tx.status === "paid") ? "paid" : "pending")

  const submitReturn = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void returnMutation.mutateAsync()
  }

  const runStatusAction = async (action: "cancel_request" | "return_request") => {
    setActionBusy(action)
    try {
      await statusActionMutation.mutateAsync(action)
    } finally {
      setActionBusy(null)
    }
  }

  useEffect(() => {
    if (!returnReasons.length) return
    if (!returnReasons.includes(reason)) {
      setReason(returnReasons[0] as string)
    }
  }, [reason, returnReasons])

  useEffect(() => {
    if (!order || order.status.toLowerCase() !== "delivered") return
    const userId = JSON.parse(window.localStorage.getItem("ziply5_user") || "{}")?.id as string | undefined
    const token = window.localStorage.getItem("ziply5_access_token")
    if (!token || !userId) return
    void (async () => {
      const res = await fetch(`/api/v1/reviews?orderId=${encodeURIComponent(order.id)}&userId=${encodeURIComponent(userId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = (await res.json()) as { success?: boolean; data?: Array<{ productId: string }> }
      if (!res.ok || !payload.success || !Array.isArray(payload.data)) return
      setExistingReviewedProducts(new Set(payload.data.map((x) => String(x.productId))))
    })()
  }, [order])

  const submitReview = async (productId: string, fallbackTitle: string) => {
    if (!order) return
    const userId = JSON.parse(window.localStorage.getItem("ziply5_user") || "{}")?.id as string | undefined
    const token = window.localStorage.getItem("ziply5_access_token")
    if (!token || !userId) throw new Error("Please login to submit review.")
    if (existingReviewedProducts.has(productId)) return
    const draft = reviewDrafts[productId] ?? { rating: 5, content: "" }
    if (!draft.rating || draft.rating < 1 || draft.rating > 5) throw new Error("Rating is required.")
    if (!draft.content.trim()) throw new Error("Review content is required.")
    setReviewBusyByProduct((prev) => ({ ...prev, [productId]: true }))
    try {
      const createRes = await fetch("/api/v1/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId,
          orderId: order.id,
          userId,
          rating: draft.rating,
          content: draft.content.trim(),
          title: fallbackTitle,
          sortOrder: 0,
          status: "published",
        }),
      })
      const createPayload = (await createRes.json()) as { success?: boolean; message?: string }
      if (!createRes.ok || createPayload.success === false) throw new Error(createPayload.message ?? "Unable to submit review.")
      setExistingReviewedProducts((prev) => new Set([...prev, productId]))
    } finally {
      setReviewBusyByProduct((prev) => ({ ...prev, [productId]: false }))
    }
  }

  const downloadInvoice = () => {
    if (!order) return
    const createdOn = new Date(order.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    const invoiceText = [
      `Invoice - Order ${order.id}`,
      `Order Date: ${createdOn}`,
      `Order Status: ${order.status}`,
      `Payment Status: ${paymentStatus}`,
      "",
      "Customer Details",
      `Name: ${order.customerName ?? "-"}`,
      `Phone: ${order.customerPhone ?? "-"}`,
      `Email: ${order.user?.email ?? "-"}`,
      `Address: ${order.customerAddress ?? "-"}`,
      "",
      "Items",
      ...order.items.map((item) => {
        const unit = Number(item.unitPrice ?? 0)
        const line = Number(item.lineTotal ?? unit * Number(item.quantity ?? 0))
        return `${item.product?.name ?? "Product"} | Qty: ${item.quantity} | Price: ${unit.toFixed(2)} | Subtotal: ${line.toFixed(2)}`
      }),
      "",
      "Billing",
      `Subtotal: ${Number(order.subtotal ?? 0).toFixed(2)}`,
      `Shipping: ${Number(order.shipping ?? 0).toFixed(2)}`,
      `Total: ${Number(order.total).toFixed(2)}`,
    ].join("\n")

    const blob = new Blob([invoiceText], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `invoice-${order.id}.txt`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="mx-auto max-w-7xl space-y-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="font-melon text-2xl font-bold text-[#4A1D1F]">Order details</h1>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-full border border-[#E8DCC8] bg-white px-4 py-2 text-xs font-semibold uppercase text-[#4A1D1F]"
        >
          Back
        </button>
      </div>

      {orderQuery.isLoading && <p className="text-sm text-[#646464]">Loading order details…</p>}
      {orderQuery.error && <p className="text-sm text-red-600">{orderQuery.error instanceof Error ? orderQuery.error.message : "Failed to load order."}</p>}

      {order && (
        <>
        {/* payment details div */}
          <div className="rounded-2xl border border-[#E8DCC8] bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.15em] text-[#646464]">Order ID</p>
                <p className="font-mono text-sm text-[#2A1810]">{order.id}</p>
                <p className="mt-1 text-xs text-[#646464]">
                  Order created on {new Date(order.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              </div>
              <span className="rounded-full bg-[#FDF0E6] px-3 py-1 text-[11px] font-semibold uppercase text-[#7B3010]">{order.status}</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-[#646464]">Payment status: <span className="font-semibold uppercase">{paymentStatus}</span></p>
              <button
                type="button"
                onClick={downloadInvoice}
                className="rounded-full border border-[#E8DCC8] bg-white px-4 py-2 text-xs font-semibold uppercase text-[#4A1D1F]"
              >
                Download Invoice
              </button>
            </div>
            {(paymentStatus ?? "").toUpperCase() === "SUCCESS" && ["confirmed", "packed"].includes(order.status.toLowerCase()) && !cancelRequested && (
              <button
                type="button"
                onClick={() => void runStatusAction("cancel_request")}
                disabled={actionBusy === "cancel_request"}
                className="mt-2 rounded-full border border-[#E8DCC8] bg-white px-4 py-2 text-xs font-semibold uppercase text-[#4A1D1F] disabled:opacity-40"
              >
                {actionBusy === "cancel_request" ? "Submitting..." : "Request cancel"}
              </button>
            )}
          </div>
            {/* order timelines */}
          <div className="rounded-2xl border border-[#E8DCC8] bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-[#4A1D1F]">Order timeline</h2>
            <div className="grid gap-2 md:grid-cols-3">
              {timeline.map((step) => {
                const reached = historySet.has(step) || order.status.toLowerCase() === step
                return (
                  <div key={step} className="rounded-lg border border-[#F2E6DD] bg-[#FFFBF7] px-3 py-2 text-xs uppercase">
                    <span className={reached ? "text-[#2A1810] font-semibold" : "text-[#646464]"}>{step}</span>
                  </div>
                )
              })}
            </div>
          </div>
              {/* order status  */}
          {order.status.toLowerCase() !== "delivered" ? (
            <div className="rounded-2xl border border-[#E8DCC8] bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-[#4A1D1F]">Shipment Details</h2>
              {order?.shipments?.length === 0 ? (
                <p className="text-sm text-[#646464]">Shipment details will appear once dispatched.</p>
              ) : (
                <div className="space-y-2 text-sm">
                  {order?.shipments?.map((shipment) => (
                    <div key={shipment.id} className="rounded-lg border border-[#F2E6DD] bg-[#FFFBF7] p-3">
                      <p><span className="font-semibold">Carrier:</span> {shipment.carrier ?? "Carrier TBD"}</p>
                      <p><span className="font-semibold">Tracking Number:</span> {shipment.trackingNo ?? "Not assigned"}</p>
                      <p><span className="font-semibold">Shipment Status:</span> {(shipment.shipmentStatus ?? "pending").toUpperCase()}</p>
                      <p><span className="font-semibold">ETA:</span> {shipment.eta ? new Date(shipment.eta).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "TBD"}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-[#E8DCC8] bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-[#4A1D1F]">Delivery Info</h2>
              <p className="text-sm text-[#646464]">
                Delivered date: {order.deliveredAt ? new Date(order.deliveredAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Delivered"}
              </p>
            </div>
          )}
      
          {(order?.returnRequests?.length > 0 || order?.refunds?.length > 0) && (
            <div className="rounded-2xl border border-[#E8DCC8] bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-[#4A1D1F]">Return / Refund Status</h2>
              {order.returnRequests[0] && (
                <p className="text-sm text-[#646464]">Return: <span className="font-semibold uppercase">{order.returnRequests[0].status}</span></p>
              )}
              {order.refunds[0] && (
                <p className="text-sm text-[#646464]">Refund: <span className="font-semibold uppercase">{order.refunds[0].status}</span></p>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-[#E8DCC8] bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-[#4A1D1F]">Customer Details</h2>
            <div className="space-y-1 text-sm text-[#646464]">
              <p><span className="font-semibold text-[#2A1810]">Name:</span> {order.customerName ?? "-"}</p>
              <p><span className="font-semibold text-[#2A1810]">Phone:</span> {order.customerPhone ?? "-"}</p>
              <p><span className="font-semibold text-[#2A1810]">Email:</span> {order.user?.email ?? "-"}</p>
              <p><span className="font-semibold text-[#2A1810]">Delivery Address:</span> {order.customerAddress ?? "-"}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E8DCC8] bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-[#4A1D1F]">Items</h2>
            <div className="space-y-2">
              {order.items.map((item) => (
                <div key={item.id} className="rounded-lg border border-[#F2E6DD] bg-[#FFFBF7] p-3 text-sm text-[#646464]">
                  <p className="font-semibold text-[#2A1810]">{item.product?.name ?? "Product"}</p>
                  <p>Quantity: {item.quantity}</p>
                  <p>Price: {order.currency} {Number(item.unitPrice ?? 0).toFixed(2)}</p>
                  <p>Subtotal: {order.currency} {Number(item.lineTotal ?? Number(item.unitPrice ?? 0) * Number(item.quantity ?? 0)).toFixed(2)}</p>
                  {order.status.toLowerCase() === "delivered" && item.productId && (
                    <div className="mt-3 rounded-lg border border-[#E8DCC8] bg-white p-3">
                      {existingReviewedProducts.has(item.productId) ? (
                        <p className="text-xs font-semibold uppercase text-[#5A272A]">Already reviewed</p>
                      ) : (
                        <>
                          <div className="mb-2 flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => {
                              const rating = reviewDrafts[item.productId!]?.rating ?? 5
                              return (
                                <button
                                  key={`${item.id}-star-${star}`}
                                  type="button"
                                  onClick={() =>
                                    setReviewDrafts((prev) => ({
                                      ...prev,
                                      [item.productId!]: { rating: star, content: prev[item.productId!]?.content ?? "" },
                                    }))
                                  }
                                  className={`text-lg ${star <= rating ? "text-[#F59E0B]" : "text-[#D1D5DB]"}`}
                                >
                                  ★
                                </button>
                              )
                            })}
                          </div>
                          <textarea
                            value={reviewDrafts[item.productId]?.content ?? ""}
                            onChange={(event) =>
                              setReviewDrafts((prev) => ({
                                ...prev,
                                [item.productId!]: { rating: prev[item.productId!]?.rating ?? 5, content: event.target.value },
                              }))
                            }
                            placeholder="Write your review"
                            className="w-full rounded-md border border-[#D9D9D1] px-2 py-1.5 text-xs"
                            rows={3}
                          />
                          <button
                            type="button"
                            onClick={() => void submitReview(item.productId!, item.product?.name ?? "Product")}
                            disabled={Boolean(reviewBusyByProduct[item.productId])}
                            className="mt-2 rounded-md bg-[#7B3010] px-3 py-1.5 text-xs font-semibold uppercase text-white disabled:opacity-50"
                          >
                            {reviewBusyByProduct[item.productId] ? "Submitting..." : "Submit Review"}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#E8DCC8] bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-[#4A1D1F]">Billing</h2>
            <div className="space-y-1 text-sm text-[#646464]">
              <p>Subtotal: <span className="font-semibold text-[#2A1810]">{order.currency} {Number(order.subtotal ?? 0).toFixed(2)}</span></p>
              <p>Shipping: <span className="font-semibold text-[#2A1810]">{order.currency} {Number(order.shipping ?? 0).toFixed(2)}</span></p>
              <p>Total: <span className="font-semibold text-[#2A1810]">{order.currency} {Number(order.total).toFixed(2)}</span></p>
            </div>
          </div>

          {order.status.toLowerCase() === "delivered" && (
            <div className="rounded-2xl border border-[#E8DCC8] bg-white p-4 shadow-sm">
              {!returnExists && !returnRequested ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowReturnForm((value) => !value)}
                    className="rounded-full bg-[#7B3010] px-4 py-2 text-xs font-semibold uppercase text-white"
                  >
                    Request Return
                  </button>
                  {showReturnForm && (
                    <form onSubmit={submitReturn} className="mt-3 space-y-3">
                      <select
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        className="w-full rounded-lg border border-[#D9D9D1] bg-white px-3 py-2 text-sm"
                      >
                        {returnReasons.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      <textarea
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder="Describe the issue"
                        className="w-full rounded-lg border border-[#D9D9D1] bg-white px-3 py-2 text-sm"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={returnMutation.isPending}
                          className="rounded-full bg-[#7B3010] px-4 py-2 text-xs font-semibold uppercase text-white disabled:opacity-50"
                        >
                          {returnMutation.isPending ? "Submitting..." : "Submit return request"}
                        </button>
                        <button
                          type="button"
                          disabled={actionBusy === "return_request"}
                          onClick={() => void runStatusAction("return_request")}
                          className="rounded-full border border-[#E8DCC8] bg-white px-4 py-2 text-xs font-semibold uppercase text-[#4A1D1F] disabled:opacity-40"
                        >
                          {actionBusy === "return_request" ? "Submitting..." : "Quick return request"}
                        </button>
                      </div>
                      {returnMutation.error && (
                        <p className="text-sm text-red-600">
                          {returnMutation.error instanceof Error ? returnMutation.error.message : "Could not submit return request."}
                        </p>
                      )}
                    </form>
                  )}
                </>
              ) : (
                <p className="text-sm font-semibold text-[#4A1D1F]">RETURN_REQUESTED</p>
              )}
            </div>
          )}
        </>
      )}
    </section>
  )
}
