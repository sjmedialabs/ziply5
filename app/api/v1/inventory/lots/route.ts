import { NextRequest } from "next/server"
import { z } from "zod"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { createInventoryLot, fifoAllocateLots, listInventoryLots } from "@/src/server/modules/warehouses/warehouses.service"

const createSchema = z.object({
  productId: z.string().min(1),
  warehouseId: z.string().min(1),
  variantId: z.string().optional().nullable(),
  batchNo: z.string().min(1),
  mfgDate: z.string().datetime().optional().nullable(),
  expiryDate: z.string().datetime().optional().nullable(),
  qtyReceived: z.number().int().positive(),
  costPerUnit: z.number().optional().nullable(),
  notes: z.string().optional(),
})

const fifoSchema = z.object({
  productId: z.string().min(1),
  requiredQty: z.number().int().positive(),
  warehouseId: z.string().optional(),
})

export async function GET(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const denied = requirePermission(auth.user.role, "inventory.lots.read")
  if (denied) return denied
  const productId = request.nextUrl.searchParams.get("productId") ?? undefined
  const warehouseId = request.nextUrl.searchParams.get("warehouseId") ?? undefined
  const includeExpired = request.nextUrl.searchParams.get("includeExpired") === "1"
  const rows = await listInventoryLots({ productId, warehouseId, includeExpired })
  return ok(rows, "Inventory lots fetched")
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const denied = requirePermission(auth.user.role, "inventory.lots.create")
  if (denied) return denied
  const body = await request.json()
  const mode = (body?.mode ?? "create") as "create" | "fifo_preview"

  if (mode === "fifo_preview") {
    const parsed = fifoSchema.safeParse(body)
    if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())
    const result = await fifoAllocateLots(parsed.data)
    return ok(result, "FIFO allocation preview")
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())
  try {
    const row = await createInventoryLot({
      productId: parsed.data.productId,
      warehouseId: parsed.data.warehouseId,
      variantId: parsed.data.variantId ?? undefined,
      batchNo: parsed.data.batchNo,
      mfgDate: parsed.data.mfgDate ? new Date(parsed.data.mfgDate) : null,
      expiryDate: parsed.data.expiryDate ? new Date(parsed.data.expiryDate) : null,
      qtyReceived: parsed.data.qtyReceived,
      costPerUnit: parsed.data.costPerUnit ?? null,
      notes: parsed.data.notes,
    })
    return ok(row, "Inventory lot created", 201)
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Create failed", 400)
  }
}
