import { NextRequest } from "next/server"

export const isTrustedOrigin = (request: NextRequest) => {
  const origin = request.headers.get("origin")
  if (!origin) return true
  const host = request.headers.get("host")
  if (!host) return false
  try {
    const u = new URL(origin)
    return u.host === host
  } catch {
    return false
  }
}
