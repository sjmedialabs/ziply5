import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { listAbandonedCarts, upsertAbandonedCart, deleteAbandonedCartBySession } from "@/src/server/modules/extended/extended.service"
import { z } from "zod"

const createSchema = z.object({
  sessionKey: z.string().min(4),
  email: z.string().email().optional().nullable(),
  itemsJson: z.unknown(),
  total: z.number().optional().nullable(),
})

export async function GET(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const denied = requirePermission(auth.user.role, "abandoned.read")
  if (denied) return denied
  const rows = await listAbandonedCarts()
  return ok(rows, "Abandoned carts")
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())
  try {
    const row = await upsertAbandonedCart({
      sessionKey: parsed.data.sessionKey,
      email: parsed.data.email,
      itemsJson: parsed.data.itemsJson,
      total: parsed.data.total,
    })
    return ok(row, "Saved", 201)
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error", 400)
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionKey = searchParams.get("sessionKey")
  if (!sessionKey) return fail("sessionKey required", 400)
  try {
    await deleteAbandonedCartBySession(sessionKey)
    return ok(null, "Abandoned cart removed")
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error", 400)
  }
}
