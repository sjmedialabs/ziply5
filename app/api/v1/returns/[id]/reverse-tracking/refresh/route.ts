import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { pgQuery } from "@/src/server/db/pg"
import { syncReturnRequestReverseTracking } from "@/src/server/modules/shipping/shiprocket.tracking"

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const { id } = await ctx.params

  const rows = await pgQuery<Array<{ orderId: string; userId: string | null }>>(
    `SELECT "orderId", "userId" FROM "ReturnRequest" WHERE id = $1 LIMIT 1`,
    [id],
  )
  const row = rows[0]
  if (!row) return fail("Return not found", 404)

  const isAdmin = ["admin", "super_admin"].includes(auth.user.role)
  if (!isAdmin) {
    if (row.userId !== auth.user.sub) return fail("Forbidden", 403)
    const denied = requirePermission(auth.user.role, "returns.create")
    if (denied) return denied
  } else {
    const denied = requirePermission(auth.user.role, "returns.update")
    if (denied) return denied
  }

  try {
    const data = await syncReturnRequestReverseTracking(id)
    return ok(data, "Return tracking refreshed")
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Refresh failed", 400)
  }
}
