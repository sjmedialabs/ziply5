import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { getRecoverySettings, saveRecoverySettings } from "@/src/server/modules/abandoned-carts/recovery.service"
import { z } from "zod"

const ensureAdmin = (role: string) => role === "admin" || role === "super_admin"

const schema = z.object({
  enabled: z.boolean().optional(),
  abandonThresholdMinutes: z.number().int().positive().optional(),
  maxRemindersPerCart: z.number().int().positive().optional(),
  stopAfterPurchase: z.boolean().optional(),
  respectOptOut: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  whatsappEnabled: z.boolean().optional(),
  tokenExpiryMinutes: z.number().int().positive().optional(),
  attributionModel: z.enum(["last_click", "first_click"]).optional(),
  schedule: z
    .array(
      z.object({
        stepNo: z.number().int().positive(),
        delayMinutes: z.number().int().min(0),
        channels: z.array(z.enum(["email", "sms", "whatsapp"])).min(1),
        template: z.string().optional(),
        includeCoupon: z.boolean().optional(),
        active: z.boolean().optional(),
      }),
    )
    .optional(),
})

export async function GET(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  if (!ensureAdmin(auth.user.role)) return fail("Forbidden", 403)
  const settings = await getRecoverySettings()
  return ok(settings, "Abandoned cart settings")
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  if (!ensureAdmin(auth.user.role)) return fail("Forbidden", 403)
  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())
  const settings = await saveRecoverySettings(parsed.data)
  return ok(settings, "Settings saved")
}

