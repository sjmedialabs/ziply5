import { NextRequest } from "next/server"
import { ok } from "@/src/server/core/http/response"
import { optionalAuth } from "@/src/server/middleware/optionalAuth"
import { getAllMasterData } from "@/src/server/modules/master/master.service"
import { getMasterCache, setMasterCache } from "@/src/server/modules/master/master.cache"

export async function GET(request: NextRequest) {
  const activeOnly = request.nextUrl.searchParams.get("activeOnly") !== "false"
  const user = optionalAuth(request)
  const normalizedActiveOnly = user?.role === "super_admin" ? false : activeOnly
  const cacheKey = `all:${user?.role ?? "public"}:${normalizedActiveOnly}`
  const cached = getMasterCache<unknown[]>(cacheKey)
  if (cached) return ok(cached, "Master data fetched")
  const rows = await getAllMasterData(normalizedActiveOnly)
  setMasterCache(cacheKey, rows)
  return ok(rows, "Master data fetched")
}
