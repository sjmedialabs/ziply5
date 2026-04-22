import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { deleteMasterGroup, updateMasterGroup } from "@/src/server/modules/master/master.service"
import { clearMasterCache } from "@/src/server/modules/master/master.cache"

export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  if (auth.user.role !== "super_admin") return fail("Forbidden", 403)
  const { id } = await ctx.params
  const body = (await request.json()) as { name?: string; description?: string | null; isActive?: boolean }
  try {
    const row = await updateMasterGroup(id, body)
    clearMasterCache()
    return ok(row, "Master group updated")
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
    const row = await deleteMasterGroup(id)
    clearMasterCache()
    return ok(row, "Master group deleted")
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error"
    return fail(message, 400)
  }
}
