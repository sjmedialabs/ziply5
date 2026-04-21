"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { authedFetch } from "@/lib/dashboard-fetch"
import { Button } from "@/components/ui/button"

type OrderDetail = {
  id: string
  status: string
  total: string | number
  subtotal: string | number
  shipping: string | number
  currency: string
  createdAt: string
  items: Array<{ quantity: number; product: { id: string; name: string; slug: string } }>
  transactions?: Array<{ id: string; gateway: string; amount: string | number; status: string; createdAt: string }>
  statusHistory?: Array<{ toStatus: string; changedAt: string }>
  shipments?: Array<{ id: string; carrier: string | null; trackingNo: string | null; shipmentStatus: string }>
  returnRequests?: Array<{ id: string; status: string; reason: string | null }>
  refunds?: Array<{ id: string; status: string; amount: string | number }>
  paymentStatus?: string | null
  paymentId?: string | null
}

export default function AdminOrderDetailPage() {
  const params = useParams() as { id?: string }
  const router = useRouter()
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [actionBusy, setActionBusy] = useState<string | null>(null)
  const lifecycleStatus = (order?.statusHistory?.[0]?.toStatus ?? order?.status ?? "").toLowerCase()
  const refundStatus = (order?.refunds?.[0]?.status ?? "pending").toLowerCase()

  const loadOrder = async () => {
    if (!params.id) return
    setLoading(true)
    setError("")
    return authedFetch<OrderDetail>(`/api/v1/orders/${params.id}`)
      .then((data) => setOrder(data))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    void loadOrder()
  }, [params.id])

  const runAction = async (
    action: "approve_order" | "approve_cancel" | "reject_cancel" | "approve_return" | "reject_return" | "trigger_refund" | "retry_refund",
  ) => {
    if (!params.id) return
    setActionBusy(action)
    setError("")
    try {
      await authedFetch(`/api/v1/orders/${params.id}/actions`, {
        method: "POST",
        body: JSON.stringify({ action }),
      })
      await loadOrder()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed")
    } finally {
      setActionBusy(null)
    }
  }

  return (
    <section className="mx-auto max-w-5xl space-y-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-melon text-2xl font-bold text-[#4A1D1F]">Order details</h1>
          <p className="text-sm text-[#646464]">Review payment, shipping, and line items.</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          Back to orders
        </Button>
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : loading ? (
        <p className="text-sm text-[#646464]">Loading order details…</p>
      ) : order ? (
        <div className="space-y-4">
          <div className="grid gap-4 rounded-2xl border border-[#E8DCC8] bg-white p-4 shadow-sm md:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-[#646464]">Order</p>
              <p className="font-semibold text-[#2A1810]">{order.id}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-[#646464]">Placed</p>
              <p className="font-semibold text-[#2A1810]">{new Date(order.createdAt).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-[#646464]">Status</p>
              <p className="font-semibold text-[#2A1810] capitalize">{order.status}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-[#646464]">Payment</p>
              <p className="font-semibold text-[#2A1810] uppercase">{order.paymentStatus ?? "PENDING"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-[#646464]">Payment Ref</p>
              <p className="font-mono text-xs text-[#2A1810]">{order.paymentId ?? "—"}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E8DCC8] bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-[#4A1D1F]">Lifecycle timeline</h2>
            <p className="text-xs uppercase text-[#646464]">
              {(order.statusHistory ?? [])
                .map((entry) => entry.toStatus.toUpperCase())
                .slice(0, 7)
                .reverse()
                .join(" → ") || "CREATED"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {lifecycleStatus === "admin_approval_pending" && (
                <Button variant="outline" disabled={actionBusy === "approve_order"} onClick={() => void runAction("approve_order")}>
                  {actionBusy === "approve_order" ? "Working..." : "Approve Order"}
                </Button>
              )}
              {lifecycleStatus === "cancel_requested" && (
                <>
                  <Button variant="outline" disabled={actionBusy === "approve_cancel"} onClick={() => void runAction("approve_cancel")}>
                    {actionBusy === "approve_cancel" ? "Working..." : "Approve Cancel"}
                  </Button>
                  <Button variant="outline" disabled={actionBusy === "reject_cancel"} onClick={() => void runAction("reject_cancel")}>
                    {actionBusy === "reject_cancel" ? "Working..." : "Reject Cancel"}
                  </Button>
                </>
              )}
              {lifecycleStatus === "return_requested" && (
                <>
                  <Button variant="outline" disabled={actionBusy === "approve_return"} onClick={() => void runAction("approve_return")}>
                    {actionBusy === "approve_return" ? "Working..." : "Approve Return"}
                  </Button>
                  <Button variant="outline" disabled={actionBusy === "reject_return"} onClick={() => void runAction("reject_return")}>
                    {actionBusy === "reject_return" ? "Working..." : "Reject Return"}
                  </Button>
                </>
              )}
              {refundStatus === "initiated" && (
                <>
                  <Button variant="outline" disabled={actionBusy === "trigger_refund"} onClick={() => void runAction("trigger_refund")}>
                    {actionBusy === "trigger_refund" ? "Working..." : "Trigger Refund"}
                  </Button>
                </>
              )}
              {["failed", "rejected"].includes(refundStatus) && (
                <>
                  <Button variant="outline" disabled={actionBusy === "retry_refund"} onClick={() => void runAction("retry_refund")}>
                    {actionBusy === "retry_refund" ? "Working..." : "Retry Refund"}
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="grid gap-4 rounded-2xl border border-[#E8DCC8] bg-white p-4 shadow-sm md:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-[#646464]">Subtotal</p>
              <p className="font-semibold text-[#2A1810]">{order.currency} {Number(order.subtotal).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-[#646464]">Shipping</p>
              <p className="font-semibold text-[#2A1810]">{order.currency} {Number(order.shipping).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-[#646464]">Total</p>
              <p className="font-semibold text-[#2A1810]">{order.currency} {Number(order.total).toFixed(2)}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E8DCC8] bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-[#4A1D1F]">Line items</h2>
            <ul className="space-y-3 text-sm text-[#2A1810]">
              {order.items.map((item) => (
                <li key={`${item.product.id}-${item.quantity}`} className="rounded-lg border border-[#F2E6DD] bg-[#FFFBF7] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span>{item.product.name}</span>
                    <span className="font-semibold">×{item.quantity}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-[#E8DCC8] bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-[#4A1D1F]">Transactions</h2>
            {!order.transactions?.length ? (
              <p className="text-sm text-[#646464]">No transaction records found.</p>
            ) : (
              <div className="space-y-3 text-sm">
                {order.transactions.map((tx) => (
                  <div key={tx.id} className="rounded-lg border border-[#F2E6DD] bg-[#FFFBF7] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{tx.gateway}</p>
                        <p className="text-xs text-[#646464]">{new Date(tx.createdAt).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{order.currency} {Number(tx.amount).toFixed(2)}</p>
                        <p className="text-xs uppercase text-[#646464]">{tx.status}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-[#E8DCC8] bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-[#4A1D1F]">Refund info</h2>
            {!order.refunds?.length ? (
              <p className="text-sm text-[#646464]">No refund records found.</p>
            ) : (
              <div className="space-y-2 text-sm">
                {order.refunds.map((refund) => (
                  <div key={refund.id} className="rounded-lg border border-[#F2E6DD] bg-[#FFFBF7] p-3">
                    <p className="font-mono text-xs">{refund.id}</p>
                    <p className="font-semibold">{Number(refund.amount).toFixed(2)}</p>
                    <p className="text-xs uppercase text-[#646464]">{refund.status}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  )
}
