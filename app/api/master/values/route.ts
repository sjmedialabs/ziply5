import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { optionalAuth } from "@/src/server/middleware/optionalAuth"
import { requireAuth } from "@/src/server/middleware/auth"
import { createMasterValueSchema } from "@/src/server/modules/master/master.validator"
import { createMasterValue, listMasterValues } from "@/src/server/modules/master/master.service"
import { clearMasterCache, getMasterCache, setMasterCache } from "@/src/server/modules/master/master.cache"

export async function GET(request: NextRequest) {
  const group = request.nextUrl.searchParams.get("group")
  if (!group) return fail("group query parameter is required", 422)
  const activeOnly = request.nextUrl.searchParams.get("activeOnly") !== "false"
  const user = optionalAuth(request)
  const cacheKey = `values:${group}:${user?.role ?? "public"}:${activeOnly}`
  const cached = getMasterCache<unknown[]>(cacheKey)
  if (cached) return ok(cached, "Master values fetched")
  const values = await listMasterValues(group, {
    activeOnly: user?.role === "super_admin" ? false : activeOnly,
  })
  setMasterCache(cacheKey, values)
  return ok(values, "Master values fetched")
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  if (auth.user.role !== "super_admin") return fail("Forbidden", 403)

  const body = await request.json()
  const parsed = createMasterValueSchema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())
  try {
    const row = await createMasterValue(parsed.data)
    clearMasterCache()
    return ok(row, "Master value created", 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error"
    return fail(message, 400)
  }
}
