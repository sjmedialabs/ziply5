import { NextRequest } from "next/server"
import { z } from "zod"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import {
  getOrderById,
  setOrderCancelReason,
  setOrderReturnReason,
  updateOrderStatus,
} from "@/src/server/modules/orders/orders.service"
import { createRefund } from "@/src/server/modules/extended/extended.service"
import { triggerRazorpayRefund } from "@/src/server/modules/payments/payments.service"
import { env } from "@/src/server/core/config/env"

const schema = z.object({
  action: z.enum([
    "cancel_request",
    "cancel_pending",
    "return_request",
    "approve_order",
    "reject_order",
    "approve_cancel",
    "reject_cancel",
    "approve_return",
    "reject_return",
    "trigger_refund",
    "retry_refund",
  ]),
  reason: z.string().max(500).optional(),
  amount: z.number().positive().optional(),
})

const normalizePaymentStatus = (value?: string | null) => {
  const status = (value ?? "").toUpperCase()
  if (status === "PAID") return "SUCCESS"
  return status || "PENDING"
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const { id } = await ctx.params
  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())

  const order = await getOrderById(id)
  if (!order) return fail("Order not found", 404)
  const lifecycleStatus = String(order.statusHistory?.[0]?.toStatus ?? order.status ?? "").toLowerCase()
  const isAdmin = ["admin", "super_admin"].includes(auth.user.role)
  if (!isAdmin && order.userId !== auth.user.sub) {
    return fail("Forbidden", 403)
  }

  try {
    if (parsed.data.action === "cancel_request") {
      const paymentStatus = normalizePaymentStatus(order.paymentStatus)
      // Only allow cancellation if not yet shipped
      if (!["pending", "pending_payment", "payment_success", "confirmed", "packed", "admin_approval_pending"].includes(lifecycleStatus)) {
        return fail("Cannot cancel order after it has been shipped", 422)
      }

      // Perform auto-cancellation
      const updated = await updateOrderStatus(order.id, "cancelled", auth.user.sub, {
        reasonCode: "customer_cancelled",
        note: parsed.data.reason ?? "Customer cancelled order",
      })

      // If it was already paid, trigger an immediate refund
      if (paymentStatus === "SUCCESS") {
        const amount = Number(order.total)
        const refund = await createRefund(order.id, amount, "Customer auto-cancellation refund")
        await triggerRazorpayRefund({ refundRecordId: refund.id }).catch(e => {
          console.error("[Auto-Refund Error] Failed to trigger Razorpay refund", e)
        })
      }

      return ok(updated, "Order cancelled successfully")
    }
    if (parsed.data.action === "cancel_pending") {
      await updateOrderStatus(order.id, "cancelled", auth.user.sub, {
        reasonCode: "cancel_pending",
        note: parsed.data.reason ?? "Customer cancelled pending order",
      })

      return ok({ id: order.id }, "Pending order cancelled")
    }
    if (parsed.data.action === "return_request") {
      if (lifecycleStatus !== "delivered") return fail("Return is allowed only for delivered orders", 422)
      const deliveredAt = order.statusHistory.find((entry) => entry.toStatus === "delivered")?.changedAt ?? order.updatedAt ?? new Date()
      const returnWindowDays = Number(env.RETURN_WINDOW_DAYS ?? "7")
      const elapsedDays = (Date.now() - new Date(deliveredAt).getTime()) / (1000 * 60 * 60 * 24)
      if (elapsedDays > returnWindowDays) {
        return fail(`Return window expired (${returnWindowDays} days)`, 422)
      }
      const updated = await updateOrderStatus(order.id, "return_requested", auth.user.sub, {
        reasonCode: "return_requested",
        note: parsed.data.reason ?? "Customer requested return",
      })
      if (parsed.data.reason?.trim()) {
        await setOrderReturnReason(order.id, parsed.data.reason.trim())
      }
      return ok(updated, "Return requested")
    }

    if (!isAdmin) return fail("Forbidden", 403)

    if (parsed.data.action === "approve_order") {
      const stockCheck = order.items.every((item) => {
        const row = item as any
        if (row.product?.type === "variant") {
          const variants = row.product?.variants ?? []
          const variant = variants.find((v: any) => v.id === row.variantId)
          return Number(variant?.stock ?? 0) >= Number(row.quantity ?? 0)
        }
        return Number(row.product?.totalStock ?? 0) >= Number(row.quantity ?? 0)
      })
      const serviceableCheck = Boolean(order.customerAddress?.trim())
      const fraudCheckPassed = true
      if (!stockCheck || !serviceableCheck || !fraudCheckPassed) {
        const reasons = [
          !stockCheck ? "Stock unavailable for one or more items" : null,
          !serviceableCheck ? "Delivery address/serviceability check failed" : null,
          !fraudCheckPassed ? "Fraud check failed" : null,
        ].filter(Boolean)
        return fail("Order cannot be accepted", 422, { reasons })
      }
      const updated = await updateOrderStatus(order.id, "confirmed", auth.user.sub, {
        reasonCode: "admin_approved",
        note: parsed.data.reason ?? "Admin approved order",
      })
      return ok(updated, "Order approved")
    }

    if (parsed.data.action === "reject_order") {
      const paymentStatus = normalizePaymentStatus(order.paymentStatus)
      const updated = await updateOrderStatus(order.id, "cancelled", auth.user.sub, {
        reasonCode: "admin_rejected",
        note: parsed.data.reason ?? "Admin rejected order",
      })
      if (paymentStatus === "SUCCESS") {
        const amount = parsed.data.amount ?? Number(order.total)
        const refund = await createRefund(order.id, amount, "Order rejected by admin")
        const triggered = await triggerRazorpayRefund({ refundRecordId: refund.id })
        return ok({ updated, refund, triggered }, "Order rejected and refund initiated")
      }
      return ok(updated, "Order rejected")
    }

    if (parsed.data.action === "approve_cancel") {
      const paymentStatus = normalizePaymentStatus(order.paymentStatus)
      if (paymentStatus !== "SUCCESS") return fail("Refund allowed only when payment_status = SUCCESS", 422)
      await updateOrderStatus(order.id, "cancelled", auth.user.sub, {
        reasonCode: "cancel_approved",
        note: parsed.data.reason ?? "Admin approved cancellation",
      })
      const amount = parsed.data.amount ?? Number(order.total)
      const refund = await createRefund(order.id, amount, "Cancellation refund")
      const triggered = await triggerRazorpayRefund({ refundRecordId: refund.id })
      return ok({ refund, triggered }, "Cancellation approved and refund initiated")
    }

    if (parsed.data.action === "reject_cancel") {
      const updated = await updateOrderStatus(order.id, "confirmed", auth.user.sub, {
        reasonCode: "cancel_rejected",
        note: parsed.data.reason ?? "Cancel request rejected",
      })
      return ok(updated, "Cancel request rejected")
    }

    if (parsed.data.action === "approve_return") {
      const updated = await updateOrderStatus(order.id, "return_approved", auth.user.sub, {
        reasonCode: "return_approved",
        note: parsed.data.reason ?? "Admin approved return",
      })
      return ok(updated, "Return approved")
    }

    if (parsed.data.action === "reject_return") {
      const updated = await updateOrderStatus(order.id, "delivered", auth.user.sub, {
        reasonCode: "return_rejected",
        note: parsed.data.reason ?? "Return request rejected",
      })
      return ok(updated, "Return request rejected")
    }

    const paymentStatus = normalizePaymentStatus(order.paymentStatus)
    if (paymentStatus !== "SUCCESS") return fail("Refund allowed only when payment_status = SUCCESS", 422)
    const latestRefund = order.refunds?.[0] ?? null
    let refund: any = latestRefund ?? null

    if (!refund || ["completed", "initiated"].includes(refund.status)) {
      const amount = parsed.data.amount ?? Number(order.total)
      refund = await createRefund(order.id, amount, "Manual refund trigger")
    }
    if (!refund) return fail("Unable to resolve refund record", 400)

    await updateOrderStatus(order.id, "refund_initiated", auth.user.sub, {
      reasonCode: "refund_initiated",
      note: "Refund flow initiated by admin",
    }).catch(() => null)
    const triggered = await triggerRazorpayRefund({ refundRecordId: refund.id })
    return ok({ refund, triggered }, parsed.data.action === "retry_refund" ? "Refund retry initiated" : "Refund initiated")
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Action failed", 400)
  }
}
