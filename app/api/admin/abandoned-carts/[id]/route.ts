import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { getAbandonedCartTimeline } from "@/src/server/modules/abandoned-carts/recovery.service"

const ensureAdmin = (role: string) => role === "admin" || role === "super_admin"

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  if (!ensureAdmin(auth.user.role)) return fail("Forbidden", 403)
  const { id } = await context.params
  const data = await getAbandonedCartTimeline(id)
  return ok(data, "Abandoned cart timeline")
}

