import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { setRecoveryFlags } from "@/src/server/modules/abandoned-carts/recovery.service"
import { z } from "zod"

const ensureAdmin = (role: string) => role === "admin" || role === "super_admin"

const schema = z.object({
  cartId: z.string().min(2),
  action: z.enum(["disable_recovery", "mark_ignore"]),
})

export async function POST(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  if (!ensureAdmin(auth.user.role)) return fail("Forbidden", 403)
  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())
  if (parsed.data.action === "disable_recovery") {
    await setRecoveryFlags(parsed.data.cartId, { recoveryDisabled: true })
    return ok({ cartId: parsed.data.cartId }, "Recovery disabled")
  }
  await setRecoveryFlags(parsed.data.cartId, { ignored: true })
  return ok({ cartId: parsed.data.cartId }, "Cart marked ignored")
}

