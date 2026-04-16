import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { settleReturnSchema } from "@/src/server/modules/returns/returns.validator"
import { settleReturnRequest } from "@/src/server/modules/returns/returns.service"

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const denied = requirePermission(auth.user.role, "returns.update") ?? requirePermission(auth.user.role, "finance.update")
  if (denied) return denied

  const { id } = await ctx.params
  const body = await request.json()
  const parsed = settleReturnSchema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())

  try {
    const data = await settleReturnRequest({
      returnRequestId: id,
      actorId: auth.user.sub,
      status: parsed.data.status,
      refundAmount: parsed.data.refundAmount,
      reasonCode: parsed.data.reasonCode,
      reason: parsed.data.reason,
      notes: parsed.data.notes,
    })
    return ok(data, "Return settlement processed")
  } catch (error) {
    const message = error instanceof Error ? error.message : "Settlement failed"
    if (message.toLowerCase().includes("not found")) return fail(message, 404)
    if (
      message.toLowerCase().includes("invalid return transition") ||
      message.toLowerCase().includes("already refunded") ||
      message.toLowerCase().includes("already in status") ||
      message.toLowerCase().includes("refund amount exceeds") ||
      message.toLowerCase().includes("fully refunded")
    ) {
      return fail(message, 422)
    }
    return fail(message, 400)
  }
}
