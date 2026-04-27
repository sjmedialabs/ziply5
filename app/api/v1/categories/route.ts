import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { createCategorySchema } from "@/src/server/modules/categories/categories.validator"
import { createCategory, listCategories } from "@/src/server/modules/categories/categories.service"
import { cacheKeys } from "@/lib/cache/cacheKeys"
import { cache, withCache } from "@/lib/cache/redis"
import { measureAsync } from "@/lib/performance"

const CATEGORY_TTL_MS = 30 * 60_000

export async function GET() {
  const items = await measureAsync("api.categories.list", () =>
    withCache(cacheKeys.categories(), CATEGORY_TTL_MS, () => listCategories()),
  )
  return ok(items, "Categories fetched")
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth

  const forbidden = requirePermission(auth.user.role, "categories.create")
  if (forbidden) return forbidden

  const body = await request.json()
  const parsed = createCategorySchema.safeParse(body)
  if (!parsed.success) {
    return fail("Validation failed", 422, parsed.error.flatten())
  }

  try {
    const category = await createCategory(parsed.data)
    await cache.del(cacheKeys.categories())
    return ok(category, "Category created", 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error"
    return fail(message, 400)
  }
}
