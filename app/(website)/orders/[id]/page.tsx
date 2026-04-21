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
  total: string | number
  createdAt: string
  statusHistory: Array<{ toStatus: string; changedAt: string }>
  transactions: Array<{ id: string; status: string; gateway: string; createdAt: string }>
  shipments: Array<{ id: string; carrier: string | null; trackingNo: string | null; shipmentStatus: string }>
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
  const returnReasons = returnReasonMasterQuery.data?.map((item) => item.label) ?? FALLBACK_RETURN_REASONS
  const [reason, setReason] = useState<string>((returnReasons[0] as string) ?? "Other")
  const [description, setDescription] = useState("")
  const [showReturnForm, setShowReturnForm] = useState(false)
  const [actionBusy, setActionBusy] = useState<string | null>(null)

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
  const returnExists = Boolean(order?.returnRequests.length)
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

  return (
    <section className="mx-auto max-w-4xl space-y-4 px-4 py-6">
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
          <div className="rounded-2xl border border-[#E8DCC8] bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.15em] text-[#646464]">Order ID</p>
            <p className="font-mono text-sm text-[#2A1810]">{order.id}</p>
            <p className="mt-2 text-sm text-[#646464]">Payment status: <span className="font-semibold uppercase">{paymentStatus}</span></p>
            <p className="text-sm text-[#646464]">Total: {order.currency} {Number(order.total).toFixed(2)}</p>
            <p className="text-sm text-[#646464]">
              Refund status: <span className="font-semibold uppercase">{(order.refunds[0]?.status ?? "pending").replace("_", " ")}</span>
            </p>
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

          <div className="rounded-2xl border border-[#E8DCC8] bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-[#4A1D1F]">Shipment tracking</h2>
            {order.shipments.length === 0 ? (
              <p className="text-sm text-[#646464]">Shipment details will appear once dispatched.</p>
            ) : (
              <div className="space-y-2 text-sm">
                {order.shipments.map((shipment) => (
                  <div key={shipment.id} className="rounded-lg border border-[#F2E6DD] bg-[#FFFBF7] p-3">
                    <p className="font-semibold text-[#2A1810]">{shipment.carrier ?? "Carrier TBD"}</p>
                    <p className="text-xs text-[#646464]">Tracking: {shipment.trackingNo ?? "Not assigned"}</p>
                    <p className="text-xs uppercase text-[#646464]">{shipment.shipmentStatus}</p>
                  </div>
                ))}
              </div>
            )}
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
