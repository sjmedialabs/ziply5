import { NextRequest } from "next/server"
import { z } from "zod"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { sendRecoveryTemplateTest } from "@/src/server/modules/abandoned-carts/recovery.service"

const ensureAdmin = (role: string) => role === "admin" || role === "super_admin"

const schema = z.object({
  templateKey: z.string().min(1),
  channel: z.enum(["email", "sms", "whatsapp"]),
  to: z.string().min(3),
})

export async function POST(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  if (!ensureAdmin(auth.user.role)) return fail("Forbidden", 403)
  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())

  const result = await sendRecoveryTemplateTest(parsed.data)
  return ok(result, "Test message sent")
}

