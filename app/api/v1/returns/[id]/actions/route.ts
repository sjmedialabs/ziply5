import { NextRequest } from "next/server"
import { z } from "zod"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { pgQuery } from "@/src/server/db/pg"
import { updateOrderStatus } from "@/src/server/modules/orders/orders.service"
import { createShiprocketReturnAfterAdminApproval } from "@/src/server/modules/returns/return-shiprocket.service"

const schema = z.object({
  action: z.enum(["approve", "reject", "mark_picked", "mark_received"]),
  notes: z.string().max(1000).optional(),
  rejectionReason: z.string().max(1000).optional(),
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
      const seedRows = await pgQuery<Array<{ orderId: string }>>(`SELECT "orderId" FROM "ReturnRequest" WHERE id=$1 LIMIT 1`, [id])
      const orderId = seedRows[0]?.orderId
      if (!orderId) return fail("Return request not found", 404)

      if (parsed.data.notes?.trim()) {
        await pgQuery(`UPDATE "ReturnRequest" SET "adminNote" = $2, "updatedAt"=now() WHERE id=$1`, [id, parsed.data.notes.trim()])
      }

      await createShiprocketReturnAfterAdminApproval({ seedReturnRequestId: id, actorId: auth.user.sub })

      await updateOrderStatus(orderId, "return_approved", auth.user.sub, {
        reasonCode: "return_approved",
        note: parsed.data.notes?.trim() || "Return approved; reverse pickup scheduled in Shiprocket",
      }).catch(() => null)

      return ok({ updated: true, orderId }, "Return approved and reverse pickup created")
    }
    if (parsed.data.action === "reject") {
      await pgQuery(
        `
        UPDATE "ReturnRequest"
        SET status='rejected',
            "rejectionReason"=$2,
            "rejectedAt"=now(),
            "adminNote"=COALESCE($3, "adminNote"),
            "updatedAt"=now()
        WHERE id=$1
        `,
        [id, parsed.data.rejectionReason?.trim() || "Rejected by admin", parsed.data.notes?.trim() || null],
      )
      return ok({ updated: true }, "Return rejected")
    }
    const nextStatus = parsed.data.action === "mark_picked" ? "picked_up" : "received"
    const rows = await pgQuery<Array<{ orderId: string }>>(
      `UPDATE "ReturnRequest" SET status=$2, "updatedAt"=now() WHERE id=$1 RETURNING "orderId"`,
      [id, nextStatus],
    )
    const orderId = rows[0]?.orderId
    if (nextStatus === "received" && orderId) {
      await updateOrderStatus(orderId, "refund_initiated", auth.user.sub, {
        reasonCode: "refund_initiated",
        note: "Return received, refund can be initiated",
      }).catch(() => null)
    }
    return ok({ updated: true, status: nextStatus, orderId }, nextStatus === "picked_up" ? "Return marked picked up" : "Return marked received")
  } catch (error) {
    const message = error instanceof Error ? error.message : "Action failed"
    if (message.toLowerCase().includes("not found")) return fail(message, 404)
    return fail(message, 400)
  }
}
