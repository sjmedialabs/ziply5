import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { createMasterValueSchema } from "@/src/server/modules/master/master.validator"
import { createMasterValue } from "@/src/server/modules/master/master.service"
import { clearMasterCache } from "@/src/server/modules/master/master.cache"

export async function POST(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  if (auth.user.role !== "super_admin") return fail("Forbidden", 403)
  const body = await request.json()
  const parsed = createMasterValueSchema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())
  try {
    const row = await createMasterValue(parsed.data)
    clearMasterCache()
    return ok(row, "Master value created", 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error"
    return fail(message, 400)
  }
}
