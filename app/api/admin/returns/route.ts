import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { listAdminReturnReplaceRequests } from "@/src/server/modules/commerce-extensions/returns-replace.service"

const ensureAdmin = (role: string) => role === "admin" || role === "super_admin"

export async function GET(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  if (!ensureAdmin(auth.user.role)) return fail("Forbidden", 403)
  const items = await listAdminReturnReplaceRequests()
  return ok(items, "Return/replace queue fetched")
}
