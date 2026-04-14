import { NextRequest } from "next/server"
import { fail } from "@/src/server/core/http/response"
import { verifyAccessToken } from "@/src/server/core/security/jwt"
import type { AppTokenPayload } from "@/src/server/core/security/jwt"

export type RequestContext = {
  user: AppTokenPayload
}

export const requireAuth = (request: NextRequest): RequestContext | ReturnType<typeof fail> => {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return fail("Unauthorized", 401)
  }

  const token = authHeader.replace("Bearer ", "").trim()
  try {
    const user = verifyAccessToken(token)
    return { user }
  } catch {
    return fail("Invalid or expired token", 401)
  }
}
