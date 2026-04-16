import { NextRequest } from "next/server"
import { z } from "zod"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { createBundle, listBundles } from "@/src/server/modules/bundles/bundles.service"

const createSchema = z.object({
  name: z.string().min(2),
  slug: z.string().optional(),
  productId: z.string().optional().nullable(),
  pricingMode: z.enum(["fixed", "dynamic"]).optional(),
  isCombo: z.boolean().optional(),
  isActive: z.boolean().optional(),
  items: z.array(
    z.object({
      productId: z.string().min(1),
      variantId: z.string().optional().nullable(),
      quantity: z.number().int().positive(),
      isOptional: z.boolean().optional(),
      minSelect: z.number().int().min(0).optional(),
      maxSelect: z.number().int().positive().optional().nullable(),
      sortOrder: z.number().int().min(0).optional(),
    }),
  ).min(1),
})

export async function GET(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const denied = requirePermission(auth.user.role, "bundles.read")
  if (denied) return denied
  const rows = await listBundles()
  return ok(rows, "Bundles fetched")
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const denied = requirePermission(auth.user.role, "bundles.create")
  if (denied) return denied
  const body = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())
  try {
    const row = await createBundle(parsed.data)
    return ok(row, "Bundle created", 201)
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Create failed", 400)
  }
}
