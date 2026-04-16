import { signupSchema } from "@/src/server/modules/auth/auth.validator"
import { signup } from "@/src/server/modules/auth/auth.service"
import { fail, ok } from "@/src/server/core/http/response"
import { checkRateLimit } from "@/src/server/middleware/rateLimit"

export async function GET() {
  return ok({
    endpoint: "/api/v1/auth/signup",
    method: "POST",
    contentType: "application/json",
    requiredBody: {
      name: "string",
      email: "string (email)",
      password: "string (min 8)",
      role: "super_admin | admin | customer (optional)",
    },
  })
}

export async function POST(request: Request) {
  const blocked = checkRateLimit(request, "auth:signup", { limit: 5, windowMs: 60_000 })
  if (blocked) return blocked
  try {
    const body = await request.json()
    const parsed = signupSchema.safeParse(body)
    if (!parsed.success) {
      return fail("Validation failed", 422, parsed.error.flatten())
    }

    const user = await signup(parsed.data)
    return ok(
      {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      "User registered. Welcome email from Ziply5 has been queued.",
      201,
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error"
    if (message.includes("public.User") && message.includes("does not exist")) {
      return fail(
        "Database schema is not initialized. Run prisma/init.sql in Supabase SQL Editor, then retry.",
        503,
      )
    }
    return fail(message, 400)
  }
}
