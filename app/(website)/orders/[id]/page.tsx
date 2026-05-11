"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query"
import { useRealtimeTables } from "@/hooks/useRealtimeTables"
import { useMasterValues } from "@/hooks/useMasterData"
import { Camera, X, Download } from "lucide-react"
import { toast } from "@/lib/toast"
import { generateInvoicePDF } from "@/lib/invoice"

type OrderDetail = {
  id: string
  status: string
  paymentStatus?: string | null
  currency: string
  subtotal?: string | number
  tax?: string | number
  discount?: string | number
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
  returnRequests: Array<{
    id: string
    status: string
    reason: string | null
    productId?: string | null
    items?: Array<{ id: string; orderItemId: string; requestedQty: number }>
    createdAt?: string | null
  }>
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
  const returnReasonMasterQuery = useMasterValues("RETURN_REASONS")
  const timeline = statusMasterQuery.data?.map((item) => item.value) ?? FALLBACK_TIMELINE
  const returnReasons = returnReasonMasterQuery.data ?? []

  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false)
  const [selectedItemsForReturn, setSelectedItemsForReturn] = useState<Record<string, {
    selected: boolean;
    productId: string;
    reasonCode: string;
    notes: string;
    imageUrl: string;
    quantity: number;
    uploading: boolean;
  }>>({})

  const [actionBusy, setActionBusy] = useState<string | null>(null)
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, { rating: number; content: string }>>({})
  const [existingReviewedProducts, setExistingReviewedProducts] = useState<Set<string>>(new Set())
  const [reviewBusyByProduct, setReviewBusyByProduct] = useState<Record<string, boolean>>({})

  const openReturnModal = () => {
    if (!order) return
    const initialItems: typeof selectedItemsForReturn = {}
    const selectableItems = order.items.filter((item) => !returnedProductIds.has(String(item.productId ?? "").trim()))
    const autoSelect = selectableItems.length === 1
    order.items.forEach(item => {
      const blocked = returnedProductIds.has(String(item.productId ?? "").trim())
      initialItems[item.id] = {
        selected: !blocked && autoSelect,
        productId: item.productId || "",
        reasonCode: "",
        notes: "",
        imageUrl: "",
        quantity: item.quantity,
        uploading: false,
      }
    })
    setSelectedItemsForReturn(initialItems)
    setIsReturnModalOpen(true)
  }

  const handleImageUpload = async (orderItemId: string, file: File) => {
    setSelectedItemsForReturn(prev => ({
      ...prev,
      [orderItemId]: { ...prev[orderItemId], uploading: true }
    }))
    try {
      const formData = new FormData()
      formData.append("file", file)
      const token = window.localStorage.getItem("ziply5_access_token")
      const res = await fetch("/api/v1/uploads", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      })
      const payload = await res.json()
      if (!res.ok || !payload.success) throw new Error(payload.message || "Upload failed")

      setSelectedItemsForReturn(prev => ({
        ...prev,
        [orderItemId]: { ...prev[orderItemId], imageUrl: payload.data.url, uploading: false }
      }))
    } catch (error) {
      toast.error("Upload Failed", error instanceof Error ? error.message : "Failed to upload image")
      setSelectedItemsForReturn(prev => ({
        ...prev,
        [orderItemId]: { ...prev[orderItemId], uploading: false }
      }))
    }
  }

  const submitReturnRequest = async () => {
    if (!order) return
    const itemsToReturn = Object.entries(selectedItemsForReturn)
      .filter(([_, data]) => data.selected && !returnedProductIds.has(String(data.productId ?? "").trim()))
      .map(([id, data]) => ({
        orderItemId: id,
        productId: data.productId,
        quantity: data.quantity,
        reasonCode: data.reasonCode,
        notes: data.notes,
        imageUrl: data.imageUrl
      }))

    if (itemsToReturn.length === 0) {
      toast.error("Validation Error", "Please select at least one return-eligible item.")
      return
    }

    for (const item of itemsToReturn) {
      if (!item.reasonCode) {
        toast.error("Validation Error", "Please select a reason for all selected items.")
        return
      }
    }

    const token = window.localStorage.getItem("ziply5_access_token")
    if (!token) return
    setActionBusy("return_request")
    try {
      const res = await fetch(`/api/v1/returns`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId: order.id,
          items: itemsToReturn
        }),
      })
      const payload = await res.json()
      if (!res.ok || !payload.success) throw new Error(payload.message || "Failed to submit return request")

      toast.success("Return Requested", "Your return request has been submitted successfully.")
      setIsReturnModalOpen(false)
      void queryClient.invalidateQueries({ queryKey: ["order-detail", params.id] })
    } catch (error) {
      toast.error("Error", error instanceof Error ? error.message : "Failed to submit return request")
    } finally {
      setActionBusy(null)
    }
  }

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

  const statusActionMutation = useMutation({
    mutationFn: async (action: "cancel_request") => {
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
  const returnedProductIds = useMemo(
    () =>
      new Set(
        (order?.returnRequests ?? [])
          .filter((req) => String(req.status ?? "").toLowerCase() !== "rejected")
          .map((req) => String(req.productId ?? "").trim())
          .filter(Boolean),
      ),
    [order?.returnRequests],
  )
  const hasReturnableItems = useMemo(
    () => (order?.items ?? []).some((item) => !returnedProductIds.has(String(item.productId ?? "").trim())),
    [order?.items, returnedProductIds],
  )
  const returnExists = Boolean(order?.returnRequests?.length)
  const activeReturnRequest = order?.returnRequests?.find(r => r.status.toLowerCase() !== "rejected")
  const cancelRequested = historySet.has("cancel_requested")
  const returnRequested = historySet.has("return_requested")
  const paymentStatus =
    order?.paymentStatus ??
    (order?.transactions.some((tx) => tx.status === "paid") ? "paid" : "pending")

  const runStatusAction = async (action: "cancel_request") => {
    setActionBusy(action)
    try {
      await statusActionMutation.mutateAsync(action)
      toast.success("Request Sent", "Your request has been processed successfully.")
    } finally {
      setActionBusy(null)
    }
  }

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

  const downloadInvoice = async () => {
    if (!order) return
    const success = await generateInvoicePDF(order as any)
    if (success) {
      toast.success("Success", "Invoice downloaded as PDF")
    } else {
      toast.error("Error", "Failed to generate PDF invoice")
    }
  }

  return (
    <section className="mx-auto max-w-7xl space-y-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="font-melon text-2xl font-bold text-[#4A1D1F]">Order details</h1>
        <div className="flex items-center gap-2">
          {params.id && order && order.status.toLowerCase() !== "cancelled" ? (
            <button
              type="button"
              onClick={() => router.push(`/orders/${params.id}/track`)}
              className="rounded-full border border-[#E8DCC8] bg-white px-4 py-2 text-xs font-semibold uppercase text-[#4A1D1F]"
            >
              Track my order
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-full border border-[#E8DCC8] bg-white px-4 py-2 text-xs font-semibold uppercase text-[#4A1D1F]"
          >
            Back
          </button>
        </div>
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
                onClick={() => void downloadInvoice()}
                className="flex items-center gap-2 rounded-full border border-[#E8DCC8] bg-white px-4 py-2 text-xs font-semibold uppercase text-[#4A1D1F]"
              >
                <Download size={14} />
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

          {(order.returnRequests?.length > 0 || order?.refunds?.length > 0) && (
            <div className="rounded-2xl border border-[#E8DCC8] bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-[#4A1D1F]">Return / Refund Status</h2>
              <div className="space-y-2">
                {order.returnRequests.map((req) => (
                  <p key={req.id} className="text-sm text-[#646464]">
                    Return Request: <span className="font-semibold uppercase">{req.status}</span>
                    {req.productId ? ` — Product ${req.productId}` : ""}
                    {req.reason ? ` — ${req.reason}` : ""}
                  </p>
                ))}
                {order.refunds?.map((ref) => (
                  <p key={ref.id} className="text-sm text-[#646464]">
                    Refund: <span className="font-semibold uppercase">{ref.status}</span> — {order.currency} {Number(ref.amount).toFixed(2)}
                  </p>
                ))}
              </div>
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
              <p>Tax: <span className="font-semibold text-[#2A1810]">{order.currency} {Number(order.tax ?? 0).toFixed(2)}</span></p>
              <p>Discount: <span className="font-semibold text-red-600">- {order.currency} {Number(order.discount ?? 0).toFixed(2)}</span></p>
              <p>Shipping: <span className="font-semibold text-[#2A1810]">{order.currency} {Number(order.shipping ?? 0).toFixed(2)}</span></p>
              <p>Total: <span className="font-semibold text-[#2A1810]">{order.currency} {Number(order.total).toFixed(2)}</span></p>
            </div>
          </div>

          {order.status.toLowerCase() === "delivered" && (
            <div className="rounded-2xl border border-[#E8DCC8] bg-white p-4 shadow-sm">
              {hasReturnableItems ? (
                <button
                  type="button"
                  onClick={openReturnModal}
                  className="rounded-full bg-[#7B3010] px-4 py-2 text-xs font-semibold uppercase text-white hover:opacity-90 transition-all"
                >
                  Request Return
                </button>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[#4A1D1F] uppercase">Return Processing</p>
                  <p className="text-xs text-[#646464]">All products in this order already have active return requests.</p>
                </div>
              )}
            </div>
          )}

          {isReturnModalOpen && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setIsReturnModalOpen(false)}>
              <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between bg-[#7B3010] p-5 text-white sticky top-0 z-10">
                  <h3 className="font-melon text-lg font-bold uppercase tracking-wider">Return Request</h3>
                  <button onClick={() => setIsReturnModalOpen(false)} className="rounded-full bg-white/20 p-1 hover:bg-white/30 transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  <p className="text-sm text-gray-600">Select the items you wish to return and provide a reason and photo for each.</p>

                  <div className="space-y-4">
                    {order.items.map((item) => {
                      const itemState = selectedItemsForReturn[item.id]
                      if (!itemState) return null

                      return (
                        <div key={item.id} className="border border-gray-200 rounded-xl p-4 space-y-4">
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              className="mt-1 w-4 h-4 text-[#7B3010]"
                              checked={itemState.selected}
                              onChange={(e) => setSelectedItemsForReturn(prev => ({
                                ...prev,
                                [item.id]: { ...prev[item.id], selected: e.target.checked }
                              }))}
                            />
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{item.product?.name ?? "Product"}</p>
                              <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                                  {returnedProductIds.has(String(item.productId ?? "").trim()) ? (
                                    <p className="text-[11px] font-semibold text-amber-700">Return already requested for this product.</p>
                                  ) : null}
                            </div>
                          </div>

                          {itemState.selected && !returnedProductIds.has(String(item.productId ?? "").trim()) && (
                            <div className="pl-7 space-y-3">
                              <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Reason</label>
                                <select
                                  value={itemState.reasonCode}
                                  onChange={(e) => setSelectedItemsForReturn(prev => ({
                                    ...prev,
                                    [item.id]: { ...prev[item.id], reasonCode: e.target.value }
                                  }))}
                                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 outline-none"
                                >
                                  <option value="">Select a reason</option>
                                  {returnReasons.map(r => (
                                    <option key={r.id} value={r.value}>{r.label ?? r.value}</option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Details / Issue</label>
                                <textarea
                                  rows={2}
                                  value={itemState.notes}
                                  onChange={(e) => setSelectedItemsForReturn(prev => ({
                                    ...prev,
                                    [item.id]: { ...prev[item.id], notes: e.target.value }
                                  }))}
                                  placeholder="Describe the issue..."
                                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 outline-none resize-none"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Photo Evidence</label>
                                <div className="flex items-center gap-3">
                                  <label className="cursor-pointer flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">
                                    <Camera size={14} />
                                    <span>{itemState.uploading ? "Uploading..." : "Upload Photo"}</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      disabled={itemState.uploading}
                                      onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                          void handleImageUpload(item.id, e.target.files[0])
                                        }
                                      }}
                                    />
                                  </label>
                                  {itemState.imageUrl && (
                                    <span className="text-xs text-green-600 font-medium">Image attached ✓</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setIsReturnModalOpen(false)}
                      className="flex-1 rounded-xl border border-gray-200 py-3 text-xs font-bold uppercase tracking-widest text-gray-600 hover:bg-gray-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void submitReturnRequest()}
                      disabled={actionBusy === "return_request"}
                      className="flex-1 rounded-xl bg-[#7B3010] py-3 text-xs font-bold uppercase tracking-widest text-white shadow-md hover:opacity-90 disabled:opacity-50 transition-all"
                    >
                      {actionBusy === "return_request" ? "Submitting..." : "Submit Return Request"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}
