import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { createTicketSchema } from "@/src/server/modules/tickets/tickets.validator"
import { createTicket, listTickets } from "@/src/server/modules/tickets/tickets.service"

export async function GET(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth

  const items = await listTickets(auth.user.sub, auth.user.role)
  return ok(items, "Tickets fetched")
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth

  const body = await request.json()
  const parsed = createTicketSchema.safeParse(body)
  if (!parsed.success) {
    return fail("Validation failed", 422, parsed.error.flatten())
  }

  const ticket = await createTicket(auth.user.sub, parsed.data.subject)
  return ok(ticket, "Ticket created", 201)
}
