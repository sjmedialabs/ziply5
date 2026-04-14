import { fail, ok } from "@/src/server/core/http/response"
import { checkRateLimit } from "@/src/server/middleware/rateLimit"
import { resetPasswordWithToken } from "@/src/server/modules/auth/auth.service"
import { z } from "zod"

const schema = z.object({
  token: z.string().min(10),
  password: z.string().min(8),
})

export async function POST(request: Request) {
  const blocked = checkRateLimit(request, "auth:reset", { limit: 8, windowMs: 60_000 })
  if (blocked) return blocked
  try {
    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())
    await resetPasswordWithToken(parsed.data.token, parsed.data.password)
    return ok({ ok: true }, "Password updated")
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error"
    return fail(message, 400)
  }
}
