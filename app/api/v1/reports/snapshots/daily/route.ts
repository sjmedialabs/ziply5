import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { buildDailySnapshots } from "@/src/server/modules/reports/snapshot.service"

export async function POST(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const forbidden = requirePermission(auth.user.role, "reports.enterprise.read")
  if (forbidden) return forbidden

  const body = await request.json().catch(() => ({}))
  const date = body?.date ? new Date(body.date) : new Date()
  if (Number.isNaN(date.getTime())) return fail("Invalid date", 422)

  try {
    const data = await buildDailySnapshots(date)
    return ok(data, "Daily snapshots built")
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Snapshot build failed", 400)
  }
}
