import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { updateCategorySchema } from "@/src/server/modules/categories/categories.validator"
import { updateCategory } from "@/src/server/modules/categories/categories.service"

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const auth = requireAuth(request)
  if ("status" in auth) return auth

  const forbidden = requirePermission(auth.user.role, "categories.update")
  if (forbidden) return forbidden

  const body = await request.json()
  const parsed = updateCategorySchema.safeParse(body)
  if (!parsed.success) {
    return fail("Validation failed", 422, parsed.error.flatten())
  }

  try {
    const category = await updateCategory(id, parsed.data)
    return ok(category, "Category updated")
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error"
    return fail(message, 400)
  }
}

export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return PATCH(request, ctx)
}
