import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import {
  createReturnRequest,
  listReturnRequests,
} from "@/src/server/modules/extended/extended.service"
import { pgQuery } from "@/src/server/db/pg"
import { z } from "zod"

const createSchema = z.object({
  orderId: z.string().min(1),
  reason: z.string().optional(),
  description: z.string().max(1000).optional(),
  items: z.array(
    z.object({
      orderItemId: z.string(),
      productId: z.string(),
      quantity: z.number().min(1),
      reasonCode: z.string().optional(),
      notes: z.string().optional(),
      imageUrl: z.string().optional()
    })
  ).optional(),
  productId: z.string().min(1),
  userId: z.string().min(1),
  status: z.string().optional()
})

export async function GET(request: NextRequest) {
  const auth = requireAuth(request)
  console.log("Auth result:", auth)
  if ("status" in auth) return auth
  console.log("User role:", auth.user.role)
  const denied = requirePermission(auth.user.role, "returns.read")
  console.log("Permission check result:", denied)
  if (denied) return denied
  console.log("Permission check passed")
  const rows = await listReturnRequests()
  console.log("Fetched return requests:", rows)
  return ok(rows, "Returns")
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const denied = requirePermission(auth.user.role, "returns.create")
  if (denied) return denied
  const body = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())

  const orderRows = await pgQuery<Array<{ id: string; userId: string | null }>>(
    `SELECT id, "userId" FROM "Order" WHERE id = $1 LIMIT 1`,
    [parsed.data.orderId],
  )
  const order = orderRows[0]
  if (!order) return fail("Order not found", 404)
  if (order.userId && order.userId !== auth.user.sub) {
    return fail("Not your order", 403)
  }

  try {
    const reason = [parsed.data.reason?.trim(), parsed.data.description?.trim()].filter(Boolean).join(" - ")

    // Format items to append imageUrl to notes
    const formattedItems = parsed.data.items?.map(item => ({
      orderItemId: item.orderItemId,
      productId: item.productId,
      requestedQty: item.quantity,
      reasonCode: item.reasonCode,
      imageUrl: item.imageUrl,
      notes: [item.notes?.trim(), item.imageUrl ? `Image: ${item.imageUrl}` : ""].filter(Boolean).join(" | ")
    }))

    const row = await createReturnRequest(parsed.data.orderId, order.userId, reason || undefined, formattedItems)
    return ok(row, "Return requested", 201)
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error", 400)
  }
}
