import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { createResumeLinkTokenForCart } from "@/src/server/modules/abandoned-carts/recovery.service"
import { z } from "zod"

const ensureAdmin = (role: string) => role === "admin" || role === "super_admin"

const schema = z.object({
  cartId: z.string().min(2),
})

export async function POST(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  if (!ensureAdmin(auth.user.role)) return fail("Forbidden", 403)
  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())
  const token = await createResumeLinkTokenForCart(parsed.data.cartId)
  return ok(token, "Resume link token created")
}

