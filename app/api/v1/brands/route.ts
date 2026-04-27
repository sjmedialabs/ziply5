import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { createBrand, listBrands } from "@/src/server/modules/extended/extended.service"
import { z } from "zod"
import { cacheKeys } from "@/lib/cache/cacheKeys"
import { cache, withCache } from "@/lib/cache/redis"
import { measureAsync } from "@/lib/performance"

const createSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
})

export async function GET() {
  const rows = await measureAsync("api.brands.list", () =>
    withCache(cacheKeys.brands(), 30 * 60_000, () => listBrands()),
  )
  return ok(rows, "Brands")
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const denied = requirePermission(auth.user.role, "brands.create")
  if (denied) return denied
  const body = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())
  try {
    const row = await createBrand(parsed.data.name, parsed.data.slug)
    await cache.del(cacheKeys.brands())
    return ok(row, "Brand created", 201)
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error", 400)
  }
}
