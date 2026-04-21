import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { createSupportTicketV2Schema } from "@/src/server/modules/commerce-extensions/support.validator"
import { createSupportTicketV2, listUserTicketsV2 } from "@/src/server/modules/commerce-extensions/support.service"

export async function GET(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const tickets = await listUserTicketsV2(auth.user.sub)
  return ok(tickets, "Support tickets fetched")
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const body = await request.json()
  const parsed = createSupportTicketV2Schema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())
  try {
    const id = await createSupportTicketV2({
      ...parsed.data,
      userId: auth.user.sub,
    })
    return ok({ id }, "Support ticket created", 201)
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to create ticket", 400)
  }
}
