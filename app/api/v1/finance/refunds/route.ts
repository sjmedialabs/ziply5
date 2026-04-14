import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { createRefund, listRefunds } from "@/src/server/modules/extended/extended.service"
import { z } from "zod"

const createSchema = z.object({
  orderId: z.string().min(1),
  amount: z.number().positive(),
  reason: z.string().optional(),
})

export async function GET(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const denied = requirePermission(auth.user.role, "finance.read")
  if (denied) return denied
  const rows = await listRefunds()
  return ok(rows, "Refunds")
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const denied = requirePermission(auth.user.role, "finance.update")
  if (denied) return denied
  const body = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())
  try {
    const row = await createRefund(parsed.data.orderId, parsed.data.amount, parsed.data.reason)
    return ok(row, "Refund created", 201)
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error", 400)
  }
}
