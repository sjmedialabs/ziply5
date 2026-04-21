import { NextRequest } from "next/server"
import { fail } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const denied = requirePermission(auth.user.role, "finance.update")
  if (denied) return denied
  await ctx.params
  await request.json().catch(() => null)
  return fail("Withdrawals module removed for single-vendor mode", 410)
}
