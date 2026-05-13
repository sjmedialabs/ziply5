import { fail, ok } from "@/src/server/core/http/response"
import { resetPasswordWithToken } from "@/src/server/modules/auth/auth.service"
import { z } from "zod"

const schema = z.object({ 
  token: z.string(),
  password: z.string().min(6) 
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())
    
    await resetPasswordWithToken(parsed.data.token, parsed.data.password)
    
    return ok(null, "Password reset successfully")
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error"
    return fail(message, 400)
  }
}
