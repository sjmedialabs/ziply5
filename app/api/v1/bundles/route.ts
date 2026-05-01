import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { listBundlesPublic } from "@/src/server/modules/bundles/bundles.service"

export async function GET(request: NextRequest) {
  try {
    const page = Number(request.nextUrl.searchParams.get("page") ?? 1)
    const limit = Number(request.nextUrl.searchParams.get("limit") ?? 20)
    const q = request.nextUrl.searchParams.get("q") ?? undefined
    const rows = await listBundlesPublic({ page, limit, q })
    return ok(rows, "Bundles fetched")
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to fetch bundles", 400)
  }
}
