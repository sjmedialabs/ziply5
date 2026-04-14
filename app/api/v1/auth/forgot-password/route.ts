import { fail, ok } from "@/src/server/core/http/response"
import { requestPasswordReset } from "@/src/server/modules/auth/auth.service"
import { z } from "zod"

const schema = z.object({ email: z.string().email() })

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())
    const result = await requestPasswordReset(parsed.data.email)
    return ok(result, result.message)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error"
    return fail(message, 400)
  }
}
