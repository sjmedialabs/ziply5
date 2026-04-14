import { NextRequest } from "next/server"
import { ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"

export async function GET(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  return ok(auth.user, "Authenticated user")
}
