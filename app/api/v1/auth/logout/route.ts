import { revokeRefresh } from "@/src/server/modules/auth/auth.service"
import { fail, ok } from "@/src/server/core/http/response"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { refreshToken?: string }
    if (!body.refreshToken) {
      return fail("refreshToken is required", 422)
    }

    await revokeRefresh(body.refreshToken)
    return ok({ revoked: true }, "Logged out")
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error"
    return fail(message, 400)
  }
}
