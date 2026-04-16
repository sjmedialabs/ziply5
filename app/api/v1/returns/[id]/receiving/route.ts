import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { recordReturnReceivingSchema } from "@/src/server/modules/returns/returns.validator"
import { recordReturnReceiving } from "@/src/server/modules/returns/returns.service"

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const denied = requirePermission(auth.user.role, "returns.update")
  if (denied) return denied

  const { id } = await ctx.params
  const body = await request.json()
  const parsed = recordReturnReceivingSchema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())

  try {
    const result = await recordReturnReceiving({
      returnRequestId: id,
      actorId: auth.user.sub,
      status: parsed.data.status,
      notes: parsed.data.notes,
      items: parsed.data.items,
    })
    return ok(result, "Return receiving recorded")
  } catch (error) {
    const message = error instanceof Error ? error.message : "Receiving update failed"
    if (message.toLowerCase().includes("not found")) return fail(message, 404)
    if (message.toLowerCase().includes("invalid return transition") || message.toLowerCase().includes("exceeds")) {
      return fail(message, 422)
    }
    return fail(message, 400)
  }
}
