import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { updatePromotion } from "@/src/server/modules/extended/extended.service"
import { z } from "zod"

const patchSchema = z.object({
  kind: z.enum(["flash_sale", "featured", "clearance", "custom"]).optional(),
  name: z.string().min(1).optional(),
  active: z.boolean().optional(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  productId: z.string().optional().nullable(),
  metadata: z.unknown().optional(),
})

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const denied = requirePermission(auth.user.role, "promotions.update")
  if (denied) return denied
  const { id } = await ctx.params
  const body = await request.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())
  const data: Parameters<typeof updatePromotion>[1] = { ...parsed.data }
  if (parsed.data.startsAt !== undefined) data.startsAt = parsed.data.startsAt ? new Date(parsed.data.startsAt) : null
  if (parsed.data.endsAt !== undefined) data.endsAt = parsed.data.endsAt ? new Date(parsed.data.endsAt) : null
  try {
    const row = await updatePromotion(id, data)
    return ok(row, "Updated")
  } catch {
    return fail("Not found", 404)
  }
}
