import { refreshSchema } from "@/src/server/modules/auth/auth.validator"
import { refresh } from "@/src/server/modules/auth/auth.service"
import { fail, ok } from "@/src/server/core/http/response"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = refreshSchema.safeParse(body)
    if (!parsed.success) {
      return fail("Validation failed", 422, parsed.error.flatten())
    }

    const payload = await refresh(parsed.data.refreshToken)
    return ok(payload, "Access token refreshed")
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error"
    return fail(message, 401)
  }
}
