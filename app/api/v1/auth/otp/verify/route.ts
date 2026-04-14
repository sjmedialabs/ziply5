import { fail, ok } from "@/src/server/core/http/response"
import { checkRateLimit } from "@/src/server/middleware/rateLimit"
import { verifyOtpSchema } from "@/src/server/modules/auth/auth.validator"
import { assertPortalAccess, verifyLoginOtp } from "@/src/server/modules/auth/auth.service"

export async function POST(request: Request) {
  const blocked = checkRateLimit(request, "auth:otp:verify", { limit: 20, windowMs: 60_000 })
  if (blocked) return blocked
  try {
    const body = await request.json()
    const parsed = verifyOtpSchema.safeParse(body)
    if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())
    const payload = await verifyLoginOtp(parsed.data.phone, parsed.data.code)
    assertPortalAccess(payload.user.role, parsed.data.portal ?? "website")
    return ok(payload, "OTP verified")
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed", 400)
  }
}
