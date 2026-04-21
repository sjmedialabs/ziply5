import { NextRequest } from "next/server"
import { z } from "zod"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { getOrderById, updateOrderStatus } from "@/src/server/modules/orders/orders.service"
import { createRefund } from "@/src/server/modules/extended/extended.service"
import { triggerRazorpayRefund } from "@/src/server/modules/payments/payments.service"
import { env } from "@/src/server/core/config/env"
import { prisma } from "@/src/server/db/prisma"

const schema = z.object({
  action: z.enum([
    "cancel_request",
    "return_request",
    "approve_order",
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
  const isAdmin = ["admin", "super_admin"].includes(auth.user.role)
  if (!isAdmin && order.userId !== auth.user.sub) {
    return fail("Forbidden", 403)
  }

  try {
    if (parsed.data.action === "cancel_request") {
      const paymentStatus = normalizePaymentStatus(order.paymentStatus)
      if (paymentStatus !== "SUCCESS") return fail("Only paid orders can be cancelled", 422)
      if (!["confirmed", "packed"].includes(order.status)) return fail("Cannot cancel after shipment", 422)
      const updated = await updateOrderStatus(order.id, "cancel_requested", auth.user.sub, {
        reasonCode: "cancel_requested",
        note: parsed.data.reason ?? "Customer requested cancellation",
      })
      if (parsed.data.reason?.trim()) {
        await prisma.$executeRawUnsafe('UPDATE "Order" SET "cancelReason" = $1 WHERE id = $2', parsed.data.reason.trim(), order.id)
      }
      return ok(updated, "Cancel requested")
    }

    if (parsed.data.action === "return_request") {
      if (order.status !== "delivered") return fail("Return is allowed only for delivered orders", 422)
      const deliveredAt = order.statusHistory.find((entry) => entry.toStatus === "delivered")?.changedAt ?? order.updatedAt
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
        await prisma.$executeRawUnsafe('UPDATE "Order" SET "returnReason" = $1 WHERE id = $2', parsed.data.reason.trim(), order.id)
      }
      return ok(updated, "Return requested")
    }

    if (!isAdmin) return fail("Forbidden", 403)

    if (parsed.data.action === "approve_order") {
      const updated = await updateOrderStatus(order.id, "confirmed", auth.user.sub, {
        reasonCode: "admin_approved",
        note: parsed.data.reason ?? "Admin approved order",
      })
      return ok(updated, "Order approved")
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
    let refund = latestRefund
      ? await prisma.refundRecord.findUnique({ where: { id: latestRefund.id } })
      : null

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
