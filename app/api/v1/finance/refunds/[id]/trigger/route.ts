import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { triggerRazorpayRefund } from "@/src/server/modules/payments/payments.service"

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const denied = requirePermission(auth.user.role, "finance.update")
  if (denied) return denied

  const { id } = await ctx.params
  try {
    const result = await triggerRazorpayRefund({ refundRecordId: id })
    return ok(result, "Refund initiated")
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Refund initiation failed", 400)
  }
}
