import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { dispatchPendingOutboxEvents } from "@/src/server/modules/integrations/outbox.service"

export async function POST(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const forbidden = requirePermission(auth.user.role, "integrations.update")
  if (forbidden) return forbidden

  const limitParam = request.nextUrl.searchParams.get("limit")
  const limit = Number(limitParam ?? "50")
  if (!Number.isFinite(limit) || limit <= 0) return fail("Invalid limit", 422)

  try {
    const result = await dispatchPendingOutboxEvents(limit)
    return ok(result, "Outbox dispatch completed")
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Dispatch failed", 400)
  }
}
