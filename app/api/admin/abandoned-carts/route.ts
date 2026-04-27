import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { detectAbandonedCarts, listAbandonedCartsDashboard } from "@/src/server/modules/abandoned-carts/recovery.service"

const ensureAdmin = (role: string) => role === "admin" || role === "super_admin"

export async function GET(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  if (!ensureAdmin(auth.user.role)) return fail("Forbidden", 403)
  const { searchParams } = new URL(request.url)
  const rows = await listAbandonedCartsDashboard({
    converted: (searchParams.get("converted") as "yes" | "no" | null) ?? undefined,
    userType: (searchParams.get("userType") as "guest" | "registered" | null) ?? undefined,
    minValue: searchParams.get("minValue") ? Number(searchParams.get("minValue")) : undefined,
    maxValue: searchParams.get("maxValue") ? Number(searchParams.get("maxValue")) : undefined,
    q: searchParams.get("q") ?? undefined,
  })
  return ok(rows, "Abandoned carts")
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  if (!ensureAdmin(auth.user.role)) return fail("Forbidden", 403)
  const body = (await request.json()) as { action?: "detect_now" }
  if (body.action === "detect_now") {
    const result = await detectAbandonedCarts()
    return ok(result, "Detection completed")
  }
  return fail("Unsupported action", 400)
}

