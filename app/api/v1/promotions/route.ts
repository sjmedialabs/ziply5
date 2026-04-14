import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { createPromotion, listPromotions } from "@/src/server/modules/extended/extended.service"
import { z } from "zod"

const createSchema = z.object({
  kind: z.enum(["flash_sale", "featured", "clearance", "custom"]),
  name: z.string().min(1),
  active: z.boolean().optional(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  productId: z.string().optional().nullable(),
  metadata: z.unknown().optional(),
})

export async function GET(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const denied = requirePermission(auth.user.role, "promotions.read")
  if (denied) return denied
  const rows = await listPromotions()
  return ok(rows, "Promotions")
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const denied = requirePermission(auth.user.role, "promotions.create")
  if (denied) return denied
  const body = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())
  const row = await createPromotion({
    kind: parsed.data.kind,
    name: parsed.data.name,
    active: parsed.data.active,
    startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : null,
    endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
    productId: parsed.data.productId ?? null,
    metadata: parsed.data.metadata,
  })
  return ok(row, "Promotion created", 201)
}
