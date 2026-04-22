import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { optionalAuth } from "@/src/server/middleware/optionalAuth"
import { requireAuth } from "@/src/server/middleware/auth"
import { listMasterGroups, createMasterGroup } from "@/src/server/modules/master/master.service"
import { createMasterGroupSchema } from "@/src/server/modules/master/master.validator"
import { clearMasterCache, getMasterCache, setMasterCache } from "@/src/server/modules/master/master.cache"

export async function GET(request: NextRequest) {
  const activeOnly = request.nextUrl.searchParams.get("activeOnly") !== "false"
  const user = optionalAuth(request)
  const cacheKey = `groups:${user?.role ?? "public"}:${activeOnly}`
  const cached = getMasterCache<unknown[]>(cacheKey)
  if (cached) return ok(cached, "Master groups fetched")
  const groups = await listMasterGroups({
    activeOnly: user?.role === "super_admin" ? false : activeOnly,
  })
  setMasterCache(cacheKey, groups)
  return ok(groups, "Master groups fetched")
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  if (auth.user.role !== "super_admin") return fail("Forbidden", 403)

  const body = await request.json()
  const parsed = createMasterGroupSchema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())
  try {
    const group = await createMasterGroup(parsed.data)
    clearMasterCache()
    return ok(group, "Master group created", 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error"
    return fail(message, 400)
  }
}
