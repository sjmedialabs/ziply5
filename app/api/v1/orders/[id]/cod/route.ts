import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { reconcileCodSchema } from "@/src/server/modules/orders/orders.validator"
import { getCodSettlement, reconcileCodSettlement } from "@/src/server/modules/orders/orders.service"

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const forbidden = requirePermission(auth.user.role, "orders.read")
  if (forbidden) return forbidden

  const { id } = await ctx.params
  try {
    const settlement = await getCodSettlement(id)
    return ok(settlement, settlement ? "COD settlement fetched" : "COD settlement not found")
  } catch (error) {
    const message = error instanceof Error ? error.message : "Fetch failed"
    if (message.toLowerCase().includes("not found")) return fail(message, 404)
    return fail(message, 400)
  }
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const forbidden = requirePermission(auth.user.role, "orders.update")
  if (forbidden) return forbidden

  const body = await request.json()
  const parsed = reconcileCodSchema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())

  const { id } = await ctx.params
  try {
    const settlement = await reconcileCodSettlement({
      orderId: id,
      actorId: auth.user.sub,
      collectedAmount: parsed.data.collectedAmount,
      settledAmount: parsed.data.settledAmount,
      status: parsed.data.status,
      notes: parsed.data.notes,
    })
    return ok(settlement, "COD reconciled", 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reconcile failed"
    if (message.toLowerCase().includes("not found")) return fail(message, 404)
    return fail(message, 400)
  }
}
