import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import {
  assertSellerOwnsInventorySource,
  listInventoryOverview,
  updateInventoryItem,
  updateVariantStock,
} from "@/src/server/modules/extended/extended.service"
import { z } from "zod"

const patchSchema = z.object({
  id: z.string().min(1),
  source: z.enum(["warehouse", "variant"]),
  available: z.number().int().nonnegative(),
  reserved: z.number().int().nonnegative().optional(),
})

export async function GET(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const denied = requirePermission(auth.user.role, "inventory.read")
  if (denied) return denied
  const sellerScope = auth.user.role === "seller" ? auth.user.sub : null
  const rows = await listInventoryOverview(sellerScope)
  return ok(rows, "Inventory")
}

export async function PATCH(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const denied = requirePermission(auth.user.role, "inventory.update")
  if (denied) return denied
  const body = await request.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())
  const sellerId = auth.user.role === "seller" ? auth.user.sub : null
  try {
    await assertSellerOwnsInventorySource(sellerId, parsed.data.source, parsed.data.id)
    if (parsed.data.source === "warehouse") {
      const row = await updateInventoryItem(
        parsed.data.id,
        parsed.data.available,
        parsed.data.reserved,
      )
      return ok(row, "Updated")
    }
    const row = await updateVariantStock(parsed.data.id, parsed.data.available)
    return ok(row, "Updated")
  } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") return fail("Forbidden", 403)
    return fail("Update failed", 400)
  }
}
