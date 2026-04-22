import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { createReturnReplaceSchema } from "@/src/server/modules/commerce-extensions/returns-replace.validator"
import { createReturnReplaceRequest } from "@/src/server/modules/commerce-extensions/returns-replace.service"

export async function POST(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  if (auth.user.role !== "customer") return fail("Forbidden", 403)
  const body = await request.json()
  const parsed = createReturnReplaceSchema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())
  try {
    const id = await createReturnReplaceRequest({
      ...parsed.data,
      userId: auth.user.sub,
    })
    return ok({ id }, "Return/replace request submitted", 201)
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to submit request", 400)
  }
}
