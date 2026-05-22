import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { optionalAuth } from "@/src/server/middleware/optionalAuth"
import { trackCartEvent, type CartEventType } from "@/src/server/modules/abandoned-carts/recovery.service"
import { z } from "zod"

const schema = z.object({
  sessionKey: z.string().min(4),
  items: z.array(z.unknown()).default([]),
  total: z.number().optional().nullable(),
  eventType: z
    .enum([
      "cart_updated",
      "cart_item_added",
      "checkout_started",
      "payment_page_opened",
    ])
    .optional()
    .default("cart_updated"),
  meta: z.record(z.string(), z.any()).optional(),
})

export async function POST(request: NextRequest) {
  const auth = optionalAuth(request)
  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return fail("Validation failed", 422, parsed.error.flatten())
  }
  const row = await trackCartEvent({
    sessionKey: parsed.data.sessionKey,
    userId: auth?.role === "customer" ? auth.sub : null,
    itemsJson: parsed.data.items,
    total: parsed.data.total ?? null,
    eventType: parsed.data.eventType as CartEventType,
    meta: parsed.data.meta,
  })
  return ok(row, "Cart activity recorded")
}
