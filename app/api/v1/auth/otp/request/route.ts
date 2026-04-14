import { fail, ok } from "@/src/server/core/http/response"
import { checkRateLimit } from "@/src/server/middleware/rateLimit"
import { requestOtpSchema } from "@/src/server/modules/auth/auth.validator"
import { requestLoginOtp } from "@/src/server/modules/auth/auth.service"

export async function POST(request: Request) {
  const blocked = checkRateLimit(request, "auth:otp:request", { limit: 6, windowMs: 60_000 })
  if (blocked) return blocked
  try {
    const body = await request.json()
    const parsed = requestOtpSchema.safeParse(body)
    if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())
    const result = await requestLoginOtp(parsed.data.phone)
    return ok(result, "OTP sent")
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed", 400)
  }
}
