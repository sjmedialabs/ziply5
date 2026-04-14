import { NextRequest } from "next/server"
import { verifyAccessToken, type AppTokenPayload } from "@/src/server/core/security/jwt"

export const optionalAuth = (request: NextRequest): AppTokenPayload | null => {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) return null
  const token = authHeader.replace("Bearer ", "").trim()
  try {
    return verifyAccessToken(token)
  } catch {
    return null
  }
}
