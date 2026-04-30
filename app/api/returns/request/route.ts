import { NextRequest } from "next/server"
import { z } from "zod"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { pgQuery } from "@/src/server/db/pg"
import { createReturnRequest } from "@/src/server/modules/extended/extended.service"
import { assertMasterValueExists, listMasterValues } from "@/src/server/modules/master/master.service"

const schema = z.object({
  orderId: z.string().min(1),
  reason: z.string().optional(),
  description: z.string().max(1000).optional(),
})

export async function POST(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const denied = requirePermission(auth.user.role, "returns.create")
  if (denied) return denied

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())

  const orderRows = await pgQuery<Array<{ id: string; userId: string | null }>>(
    `SELECT id, "userId" FROM "Order" WHERE id = $1 LIMIT 1`,
    [parsed.data.orderId],
  )
  const order = orderRows[0]
  if (!order) return fail("Order not found", 404)
  if (order.userId && order.userId !== auth.user.sub) return fail("Not your order", 403)

  try {
    if (parsed.data.reason?.trim()) {
      const byValue = await assertMasterValueExists("RETURN_REASON", parsed.data.reason.trim())
      if (!byValue) {
        const values = await listMasterValues("RETURN_REASON", { activeOnly: true })
        const byLabel = values.some(
          (entry) => entry.label.toLowerCase() === parsed.data.reason!.trim().toLowerCase(),
        )
        if (!byLabel) return fail("Invalid return reason", 422)
      }
    }
    const reason = [parsed.data.reason?.trim(), parsed.data.description?.trim()].filter(Boolean).join(" - ")
    const row = await createReturnRequest(parsed.data.orderId, order.userId, reason || undefined)
    return ok(row, "Return requested", 201)
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error", 400)
  }
}
