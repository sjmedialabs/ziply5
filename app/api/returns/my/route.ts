import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { listMyReturnReplaceRequests } from "@/src/server/modules/commerce-extensions/returns-replace.service"

export async function GET(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  if (auth.user.role !== "customer") return fail("Forbidden", 403)
  const items = await listMyReturnReplaceRequests(auth.user.sub)
  return ok(items, "Return/replace requests fetched")
}
