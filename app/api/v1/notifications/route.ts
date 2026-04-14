import { NextRequest } from "next/server"
import { ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { listNotifications } from "@/src/server/modules/notifications/notifications.service"

export async function GET(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth

  const forbidden = requirePermission(auth.user.role, "notifications.read")
  if (forbidden) return forbidden

  const items = await listNotifications(auth.user.sub)
  return ok(items, "Notifications fetched")
}
