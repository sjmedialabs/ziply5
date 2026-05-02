import { loginSchema } from "@/src/server/modules/auth/auth.validator"
import { assertPortalAccess, login } from "@/src/server/modules/auth/auth.service"
import { fail, ok } from "@/src/server/core/http/response"
import { checkRateLimit } from "@/src/server/middleware/rateLimit"

export async function POST(request: Request) {
  const blocked = checkRateLimit(request, "auth:login", { limit: 10, windowMs: 60_000 })
  if (blocked) return blocked
  try {
    const body = await request.json()
    const parsed = loginSchema.safeParse(body) 
    if (!parsed.success) {
      return fail("Validation failed", 422, parsed.error.flatten())
    }

    const payload = await login(parsed.data.email, parsed.data.password)
    assertPortalAccess(payload.user.role, parsed.data.portal ?? "website")
    return ok(payload, "Login successful")
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error"
    if (message.includes("public.User") && message.includes("does not exist")) {
      return fail(
        'Database schema is not initialized. Run supabase/sql/init.sql (and supabase/migrations/*.sql as needed) in the Supabase SQL Editor, then retry.',
        503,
      )
    }
    return fail(message, 401)
  }
}
