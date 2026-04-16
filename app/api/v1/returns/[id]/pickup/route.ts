import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { scheduleReturnPickupSchema } from "@/src/server/modules/returns/returns.validator"
import { scheduleReturnPickup } from "@/src/server/modules/returns/returns.service"

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const denied = requirePermission(auth.user.role, "returns.update")
  if (denied) return denied

  const { id } = await ctx.params
  const body = await request.json()
  const parsed = scheduleReturnPickupSchema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())

  try {
    const pickup = await scheduleReturnPickup({
      returnRequestId: id,
      actorId: auth.user.sub,
      pickupDate: new Date(parsed.data.pickupDate),
      timeSlot: parsed.data.timeSlot,
      carrier: parsed.data.carrier,
      trackingRef: parsed.data.trackingRef,
      notes: parsed.data.notes,
      items: parsed.data.items,
    })
    return ok(pickup, "Return pickup scheduled")
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pickup scheduling failed"
    if (message.toLowerCase().includes("not found")) return fail(message, 404)
    if (message.toLowerCase().includes("cannot schedule") || message.toLowerCase().includes("exceeds")) {
      return fail(message, 422)
    }
    return fail(message, 400)
  }
}
