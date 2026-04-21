import { NextRequest } from "next/server"
import { z } from "zod"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { prisma } from "@/src/server/db/prisma"
import { settleReturnRequest, recordReturnReceiving } from "@/src/server/modules/returns/returns.service"
import { updateOrderStatus } from "@/src/server/modules/orders/orders.service"

const schema = z.object({
  action: z.enum(["approve", "reject", "mark_picked", "mark_received"]),
  notes: z.string().max(1000).optional(),
})

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const denied = requirePermission(auth.user.role, "returns.update")
  if (denied) return denied

  const { id } = await ctx.params
  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())

  try {
    if (parsed.data.action === "approve") {
      const row = await settleReturnRequest({ returnRequestId: id, actorId: auth.user.sub, status: "approved", notes: parsed.data.notes })
      if (row.returnRequest?.orderId) {
        await updateOrderStatus(row.returnRequest.orderId, "return_approved", auth.user.sub, {
          reasonCode: "return_approved",
          note: "Return approved by admin",
        }).catch(() => null)
      }
      return ok(row, "Return approved")
    }
    if (parsed.data.action === "reject") {
      const row = await settleReturnRequest({ returnRequestId: id, actorId: auth.user.sub, status: "rejected", notes: parsed.data.notes })
      return ok(row, "Return rejected")
    }

    const req = await prisma.returnRequest.findUnique({
      where: { id },
      include: {
        items: true,
        order: { include: { items: true } },
      },
    })
    if (!req) return fail("Return request not found", 404)

    const items = req.order.items.map((orderItem) => {
      const reqItem = req.items.find((entry) => entry.orderItemId === orderItem.id)
      const qty = reqItem?.requestedQty ?? orderItem.quantity
      return {
        orderItemId: orderItem.id,
        receivedQty: qty,
        conditionStatus: "good" as const,
      }
    })

    const status = parsed.data.action === "mark_picked" ? "picked_up" : "received"
    const row = await recordReturnReceiving({
      returnRequestId: id,
      actorId: auth.user.sub,
      status,
      notes: parsed.data.notes,
      items,
    })
    if (status === "received" && req.order?.id) {
      await updateOrderStatus(req.order.id, "refund_initiated", auth.user.sub, {
        reasonCode: "refund_initiated",
        note: "Return received, refund can be initiated",
      }).catch(() => null)
    }
    return ok(row, status === "picked_up" ? "Return marked picked up" : "Return marked received")
  } catch (error) {
    const message = error instanceof Error ? error.message : "Action failed"
    if (message.toLowerCase().includes("not found")) return fail(message, 404)
    return fail(message, 400)
  }
}
