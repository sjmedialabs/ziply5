import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { listWithdrawals } from "@/src/server/modules/extended/extended.service"
import { z } from "zod"

const createSchema = z.object({
  amount: z.number().positive(),
  note: z.string().optional(),
})

export async function GET(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  if (!(auth.user.role === "admin" || auth.user.role === "super_admin")) return fail("Forbidden", 403)
  const denied = requirePermission(auth.user.role, "finance.read")
  if (denied) return denied
  const rows = await listWithdrawals()
  return ok(rows, "Withdrawals")
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const _body = await request.json().catch(() => null)
  const _parsed = createSchema.safeParse(_body ?? {})
  return fail("Withdrawal requests are deprecated in admin-only mode", 410)
}
