import { NextRequest } from "next/server"
import { z } from "zod"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { syncBulkShiprocketOrders } from "@/src/server/modules/shipping/shiprocket.orders"

const schema = z.object({
  orderIds: z.array(z.string().min(1)).min(1),
  generatePickup: z.boolean().optional(),
  retryFailedOnly: z.boolean().optional(),
  forceResync: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const forbidden = requirePermission(auth.user.role, "orders.update")
  if (forbidden) return forbidden
  const body = await request.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())

  try {
    const data = await syncBulkShiprocketOrders(parsed.data.orderIds, auth.user.sub, {
      generatePickup: parsed.data.generatePickup !== false,
      retryFailedOnly: parsed.data.retryFailedOnly === true,
      forceResync: parsed.data.forceResync === true,
    })
    return ok(data, "Bulk Shiprocket sync completed")
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Bulk Shiprocket sync failed", 400)
  }
}
