import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { updateReturnReplaceStatusSchema } from "@/src/server/modules/commerce-extensions/returns-replace.validator"
import { updateReturnReplaceStatus } from "@/src/server/modules/commerce-extensions/returns-replace.service"

const ensureAdmin = (role: string) => role === "admin" || role === "super_admin"

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  if (!ensureAdmin(auth.user.role)) return fail("Forbidden", 403)
  const { id } = await ctx.params
  const body = await request.json()
  const parsed = updateReturnReplaceStatusSchema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())
  try {
    await updateReturnReplaceStatus(id, parsed.data.status, auth.user.sub, parsed.data.notes)
    return ok({ id }, "Return/replace status updated")
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to update return", 400)
  }
}
