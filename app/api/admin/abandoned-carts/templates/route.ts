import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { listRecoveryTemplates, saveRecoveryTemplate } from "@/src/server/modules/abandoned-carts/recovery.service"
import { z } from "zod"

const ensureAdmin = (role: string) => role === "admin" || role === "super_admin"

export async function GET(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  if (!ensureAdmin(auth.user.role)) return fail("Forbidden", 403)
  const rows = await listRecoveryTemplates()
  return ok(rows, "Templates fetched")
}

const upsertSchema = z.object({
  templateKey: z.string().min(1),
  channel: z.enum(["email", "sms", "whatsapp"]),
  subject: z.string().optional().nullable(),
  body: z.string().min(1),
  active: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  if (!ensureAdmin(auth.user.role)) return fail("Forbidden", 403)
  const body = await request.json()
  const parsed = upsertSchema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())
  const result = await saveRecoveryTemplate(parsed.data)
  return ok(result, "Template saved")
}

