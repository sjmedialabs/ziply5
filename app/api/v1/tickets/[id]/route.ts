import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { updateTicketSchema } from "@/src/server/modules/tickets/tickets.validator"
import { updateTicketStatus } from "@/src/server/modules/tickets/tickets.service"

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth

  const forbidden = requirePermission(auth.user.role, "tickets.update")
  if (forbidden) return forbidden

  const { id } = await ctx.params
  const body = await request.json()
  const parsed = updateTicketSchema.safeParse(body)
  if (!parsed.success) {
    return fail("Validation failed", 422, parsed.error.flatten())
  }

  try {
    const ticket = await updateTicketStatus(id, parsed.data.status)
    return ok(ticket, "Ticket updated")
  } catch {
    return fail("Ticket not found", 404)
  }
}
