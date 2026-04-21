import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { createPromotion, listPromotions } from "@/src/server/modules/extended/extended.service"
import { z } from "zod"

const createSchema = z.object({
  kind: z.enum([
  "FLASH_SALE",
  "FEATURED",
  "CLEARANCE",
  "CUSTOM"
]),

  name: z.string().min(1),

  active: z.boolean().optional(),

  startsAt: z.string().datetime().optional().nullable(),

  endsAt: z.string().datetime().optional().nullable(),

  metadata: z.unknown().optional(),

  //  NEW multi-product structure
  products: z
    .array(
      z.object({
        productId: z.string(),

        // For simple product
        discountPercent: z
          .number()
          .min(0)
          .max(100)
          .optional(),

        // For variant products
        variants: z
          .array(
            z.object({
              variantId: z.string(),

              discountPercent: z
                .number()
                .min(0)
                .max(100),
            })
          )
          .optional(),
      })
    )
    .optional(),
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

  const denied = requirePermission(
    auth.user.role,
    "promotions.create"
  )

  if (denied) return denied

  const body = await request.json()

  const parsed = createSchema.safeParse(body)

  if (!parsed.success) {
    return fail(
      "Validation failed",
      422,
      parsed.error.flatten()
    )
  }

  const row = await createPromotion({

    kind: parsed.data.kind,

    name: parsed.data.name,

    active: parsed.data.active,

    startsAt:
      parsed.data.startsAt
        ? new Date(parsed.data?.startsAt)
        : null,

    endsAt:
      parsed.data.endsAt
        ? new Date(parsed.data?.endsAt)
        : null,

    metadata: parsed.data.metadata,

    //  NEW products support
    products: parsed.data.products,
  })

  return ok(row, "Promotion created", 201)
}
