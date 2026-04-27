import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { listMasterGroups, createMasterGroup } from "@/src/server/modules/master/master.service"
import { createMasterGroupSchema } from "@/src/server/modules/master/master.validator"
import { clearMasterCache, getMasterCache, setMasterCache } from "@/src/server/modules/master/master.cache"
import { cacheKeys } from "@/lib/cache/cacheKeys"
import { withCache } from "@/lib/cache/redis"
import { logger } from "@/lib/logger"

export async function GET(request: NextRequest) {
  try {
    const activeOnly = request.nextUrl.searchParams.get("activeOnly") !== "false"
    
    let role = "public"
    try {
      const auth = (await requireAuth(request)) as any
      if (auth && !("status" in auth)) {
        role = auth.user?.role ?? "public"
      }
    } catch (e) {}

    const cacheKey = `groups:${role}:${activeOnly}`
    const cached = getMasterCache<unknown[]>(cacheKey)
    if (cached) return ok(cached, "Master groups fetched")
    
    const groups = await withCache(
      cacheKeys.masterGroups(role, activeOnly),
      60 * 60_000,
      () =>
        listMasterGroups({
          activeOnly: role === "super_admin" ? false : activeOnly,
        }),
    )
    setMasterCache(cacheKey, groups)
    return ok(groups, "Master groups fetched")
  } catch (error: any) {
    logger.error("api.master.groups.get_failed", { error: error?.message ?? "unknown" })
    if (error?.message?.includes("does not exist") || error?.code === "P2010") {
      return ok([], "Master tables not created yet")
    }
    return fail("Internal Server Error", 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = (await requireAuth(request)) as any
    if ("status" in auth) return auth
    if (auth.user?.role !== "super_admin" && auth.user?.role !== "admin") return fail("Forbidden", 403)

    const body = await request.json()
    const parsed = createMasterGroupSchema.safeParse(body)
    if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())

    const group = await createMasterGroup(parsed.data)
    clearMasterCache()
    return ok(group, "Master group created", 201)
  } catch (error: any) {
    logger.error("api.master.groups.post_failed", { error: error?.message ?? "unknown" })
    return fail(error.message || "Unexpected error", 500)
  }
}
