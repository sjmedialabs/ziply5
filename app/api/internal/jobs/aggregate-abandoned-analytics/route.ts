import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { env } from "@/src/server/core/config/env"
import { aggregateAbandonedAnalyticsDaily } from "@/src/server/modules/abandoned-carts/recovery.service"

const authorize = (request: NextRequest) => {
  const incoming = request.headers.get("x-internal-job-secret")
  return Boolean(env.INTERNAL_JOB_SECRET && incoming && incoming === env.INTERNAL_JOB_SECRET)
}

export async function POST(request: NextRequest) {
  if (!authorize(request)) return fail("Forbidden", 403)
  const result = await aggregateAbandonedAnalyticsDaily()
  return ok(result, "Abandoned analytics aggregated")
}

