import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { markNotificationRead } from "@/src/server/modules/notifications/notifications.service"

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth

  const forbidden = requirePermission(auth.user.role, "notifications.read")
  if (forbidden) return forbidden

  const { id } = await ctx.params
  try {
    const row = await markNotificationRead(id, auth.user.sub)
    return ok(row, "Notification updated")
  } catch {
    return fail("Notification not found", 404)
  }
}
