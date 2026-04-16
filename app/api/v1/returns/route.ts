import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import {
  createReturnRequest,
  listReturnRequests,
} from "@/src/server/modules/extended/extended.service"
import { prisma } from "@/src/server/db/prisma"
import { z } from "zod"

const createSchema = z.object({
  orderId: z.string().min(1),
  reason: z.string().optional(),
})

export async function GET(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const denied = requirePermission(auth.user.role, "returns.read")
  if (denied) return denied
  const rows = await listReturnRequests()
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

  const order = await prisma.order.findUnique({ where: { id: parsed.data.orderId } })
  if (!order) return fail("Order not found", 404)
  if (order.userId && order.userId !== auth.user.sub) {
    return fail("Not your order", 403)
  }

  try {
    const row = await createReturnRequest(parsed.data.orderId, order.userId, parsed.data.reason)
    return ok(row, "Return requested", 201)
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error", 400)
  }
}
