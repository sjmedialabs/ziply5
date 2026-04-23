import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { adminReplyV2Schema } from "@/src/server/modules/commerce-extensions/support.validator"
import { adminReplyTicketV2 } from "@/src/server/modules/commerce-extensions/support.service"

const ensureAdmin = (role: string) => role === "admin" || role === "super_admin"

export async function POST(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  if (!ensureAdmin(auth.user.role)) return fail("Forbidden", 403)
  const body = await request.json()
  const parsed = adminReplyV2Schema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())
  await adminReplyTicketV2(parsed.data)
  return ok({ ticketId: parsed.data.ticketId }, "Reply sent")
}
