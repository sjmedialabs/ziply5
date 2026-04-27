import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { trackCartEvent, markCartConverted } from "@/src/server/modules/abandoned-carts/recovery.service"
import { z } from "zod"

const schema = z.object({
  sessionKey: z.string().min(4).optional().nullable(),
  email: z.string().email().optional().nullable(),
  mobile: z.string().optional().nullable(),
  orderId: z.string().optional().nullable(),
  status: z.enum(["initiated", "failed", "success"]),
  total: z.number().optional().nullable(),
  meta: z.record(z.string(), z.any()).optional(),
})

export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())
  if (parsed.data.status === "success") {
    const result = await markCartConverted({
      sessionKey: parsed.data.sessionKey ?? null,
      email: parsed.data.email ?? null,
      mobile: parsed.data.mobile ?? null,
      orderId: parsed.data.orderId ?? null,
      revenue: parsed.data.total ?? null,
      channel: "payment",
    })
    return ok(result, "Cart marked converted")
  }
  if (parsed.data.sessionKey) {
    await trackCartEvent({
      sessionKey: parsed.data.sessionKey,
      email: parsed.data.email ?? null,
      mobile: parsed.data.mobile ?? null,
      total: parsed.data.total ?? null,
      eventType: parsed.data.status === "failed" ? "payment_failed" : "payment_initiated",
      meta: parsed.data.meta,
    })
  }
  return ok({ tracked: true }, "Payment status recorded")
}

