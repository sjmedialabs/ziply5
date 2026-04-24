import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { createMasterValueSchema } from "@/src/server/modules/master/master.validator"
import { createMasterValue, listMasterValues, updateMasterValue } from "@/src/server/modules/master/master.service"
import { clearMasterCache, getMasterCache, setMasterCache } from "@/src/server/modules/master/master.cache"

export async function GET(request: NextRequest) {
  try {
    const group = request.nextUrl.searchParams.get("group")
    if (!group) return fail("group query parameter is required", 422)
    const activeOnly = request.nextUrl.searchParams.get("activeOnly") !== "false"
    
    let role = "public"
    try {
      // Use requireAuth safely so we don't depend on optionalAuth existing
      const auth = (await requireAuth(request)) as any
      if (auth && !("status" in auth)) {
        role = auth.user?.role ?? "public"
      }
    } catch (e) {}

    const cacheKey = `values:${group}:${role}:${activeOnly}`
    
    const cached = getMasterCache<unknown[]>(cacheKey)
    if (cached) return ok(cached, "Master values fetched")
    
    const values = await listMasterValues(group, {
      activeOnly: role === "super_admin" ? false : activeOnly,
    })
    setMasterCache(cacheKey, values)
    return ok(values, "Master values fetched")
  } catch (error: any) {
    console.error("[GET /api/master/values] Error:", error.message || error)
    
    // If tables haven't been created in the database yet, fail gracefully with an empty array
    if (error?.message?.includes("does not exist") || error?.code === "P2010") {
      return ok([], "Master tables not created yet")
    }
    return fail("Internal Server Error", 500)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = (await requireAuth(request)) as any
    if ("status" in auth) return auth
    if (auth.user?.role !== "super_admin" && auth.user?.role !== "admin") return fail("Forbidden", 403)

    const body = await request.json()
    if (!body.id) return fail("Missing id", 400)

    const updateData: any = {}
    if (body.isActive !== undefined) updateData.isActive = body.isActive
    if (body.label !== undefined) updateData.label = body.label

    const row = await updateMasterValue(body.id, updateData)
    clearMasterCache()
    return ok(row, "Master value updated", 200)
  } catch (error: any) {
    console.error("[PATCH /api/master/values] Error:", error.message || error)
    return fail(error.message || "Unexpected error", 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = (await requireAuth(request)) as any
    if ("status" in auth) return auth
    if (auth.user?.role !== "super_admin" && auth.user?.role !== "admin") return fail("Forbidden", 403)

    const body = await request.json()
    const parsed = createMasterValueSchema.safeParse(body)
    if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())
    
    const row = await createMasterValue(parsed.data)
    clearMasterCache()
    return ok(row, "Master value created", 201)
  } catch (error: any) {
    console.error("[POST /api/master/values] Error:", error.message || error)
    return fail(error.message || "Unexpected error", 500)
  }
}
