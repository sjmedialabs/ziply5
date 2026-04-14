import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { deleteUserAddress, updateUserAddress } from "@/src/server/modules/extended/extended.service"
import { z } from "zod"

const patchSchema = z.object({
  line1: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  isDefault: z.boolean().optional(),
})

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const denied = requirePermission(auth.user.role, "addresses.write")
  if (denied) return denied
  const { id } = await ctx.params
  const body = await request.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())
  const res = await updateUserAddress(id, auth.user.sub, parsed.data)
  if (res.count === 0) return fail("Not found", 404)
  return ok({ id }, "Updated")
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const denied = requirePermission(auth.user.role, "addresses.write")
  if (denied) return denied
  const { id } = await ctx.params
  const res = await deleteUserAddress(id, auth.user.sub)
  if (res.count === 0) return fail("Not found", 404)
  return ok({ id }, "Deleted")
}
