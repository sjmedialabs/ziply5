import { NextRequest } from "next/server"
import { z } from "zod"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { createCouponsBulk } from "@/src/server/modules/coupons/coupons.service"

const schema = z.object({
  prefix: z.string().min(2),
  count: z.number().int().min(1).max(500),
  discountType: z.enum(["percent", "fixed"]),
  discountValue: z.number().positive(),
  active: z.boolean().optional(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  usageLimitTotal: z.number().int().positive().optional().nullable(),
  usageLimitPerUser: z.number().int().positive().optional().nullable(),
})

export async function POST(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const denied = requirePermission(auth.user.role, "coupons.bulk.create")
  if (denied) return denied
  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())
  try {
    const coupons = await createCouponsBulk({
      prefix: parsed.data.prefix,
      count: parsed.data.count,
      discountType: parsed.data.discountType,
      discountValue: parsed.data.discountValue,
      active: parsed.data.active,
      startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : null,
      endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
      usageLimitTotal: parsed.data.usageLimitTotal ?? null,
      usageLimitPerUser: parsed.data.usageLimitPerUser ?? null,
    })
    return ok({ count: coupons.length, coupons }, "Bulk coupons generated", 201)
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Bulk create failed", 400)
  }
}
