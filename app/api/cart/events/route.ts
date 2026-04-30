import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { optionalAuth } from "@/src/server/middleware/optionalAuth"
import { trackCartEvent } from "@/src/server/modules/abandoned-carts/recovery.service"
import { z } from "zod"

const schema = z.object({
  sessionKey: z.string().min(4),
  guestId: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  mobile: z.string().optional().nullable(),
  items: z.array(z.unknown()).default([]),
  total: z.number().optional().nullable(),
  eventType: z.enum([
    // legacy
    "add_to_cart",
    "remove_item",
    "quantity_update",
    // spec / forward-compatible
    "cart_item_added",
    "cart_updated",
    "checkout_started",
    "address_entered",
    "payment_page_opened",
    "payment_attempted",
    "payment_failed",
    "payment_cancelled",
    "payment_timeout",
    "order_completed",
    "tab_closed",
    "session_expired",
  ]),
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
    guestId: parsed.data.guestId ?? null,
    email: parsed.data.email ?? null,
    mobile: parsed.data.mobile ?? null,
    itemsJson: parsed.data.items,
    total: parsed.data.total ?? null,
    eventType: parsed.data.eventType,
    meta: parsed.data.meta,
  })
  return ok(row, "Cart event recorded")
}

