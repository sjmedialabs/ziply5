import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { deleteMasterValue, updateMasterValue } from "@/src/server/modules/master/master.service"
import { updateMasterValueSchema } from "@/src/server/modules/master/master.validator"
import { clearMasterCache } from "@/src/server/modules/master/master.cache"

export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  if (auth.user.role !== "super_admin") return fail("Forbidden", 403)
  const { id } = await ctx.params
  const body = await request.json()
  const parsed = updateMasterValueSchema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())
  try {
    const row = await updateMasterValue(id, parsed.data)
    clearMasterCache()
    return ok(row, "Master value updated")
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error"
    return fail(message, 400)
  }
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  if (auth.user.role !== "super_admin") return fail("Forbidden", 403)
  const { id } = await ctx.params
  try {
    const row = await deleteMasterValue(id)
    clearMasterCache()
    return ok(row, "Master value deleted")
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error"
    return fail(message, 400)
  }
}
