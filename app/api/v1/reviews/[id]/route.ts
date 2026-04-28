import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { updateReviewStatus } from "@/src/server/modules/extended/extended.service"
import { z } from "zod"

const patchSchema = z.object({
  status: z.enum(["published", "archived"]),
})

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const denied = requirePermission(auth.user.role, "reviews.update")
  if (denied) return denied
  const { id } = await ctx.params
  const body = await request.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())
  try {
    const row = await updateReviewStatus(id, parsed.data.status)
    return ok(row, "Review updated")
  } catch {
    return fail("Not found", 404)
  }
}
