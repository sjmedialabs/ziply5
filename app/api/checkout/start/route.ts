import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { optionalAuth } from "@/src/server/middleware/optionalAuth"
import { trackCartEvent } from "@/src/server/modules/abandoned-carts/recovery.service"
import { z } from "zod"

const schema = z.object({
  sessionKey: z.string().min(4),
  email: z.string().email().optional().nullable(),
  mobile: z.string().optional().nullable(),
  items: z.array(z.unknown()).default([]),
  total: z.number().optional().nullable(),
  meta: z.record(z.string(), z.any()).optional(),
})

export async function POST(request: NextRequest) {
  const auth = optionalAuth(request)
  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())
  const row = await trackCartEvent({
    sessionKey: parsed.data.sessionKey,
    userId: auth?.role === "customer" ? auth.sub : null,
    email: parsed.data.email ?? null,
    mobile: parsed.data.mobile ?? null,
    itemsJson: parsed.data.items,
    total: parsed.data.total ?? null,
    eventType: "checkout_started",
    meta: parsed.data.meta,
  })
  return ok(row, "Checkout start recorded")
}

