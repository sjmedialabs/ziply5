import { prisma } from "@/src/server/db/prisma"

export const listWarehouses = async () => {
  return prisma.warehouse.findMany({
    where: { isActive: true },
    orderBy: [{ priority: "desc" }, { name: "asc" }],
  })
}

export const createWarehouse = async (input: {
  code: string
  name: string
  region?: string
  city?: string
  state?: string
  postalCode?: string
}) => {
  return prisma.warehouse.create({
    data: {
      code: input.code.trim().toUpperCase(),
      name: input.name.trim(),
      region: input.region?.trim() || null,
      city: input.city?.trim() || null,
      state: input.state?.trim() || null,
      postalCode: input.postalCode?.trim() || null,
    },
  })
}

export const listInventoryLots = async (params?: {
  productId?: string
  warehouseId?: string
  includeExpired?: boolean
}) => {
  const now = new Date()
  return prisma.inventoryStockLot.findMany({
    where: {
      ...(params?.productId ? { productId: params.productId } : {}),
      ...(params?.warehouseId ? { warehouseId: params.warehouseId } : {}),
      ...(params?.includeExpired ? {} : { OR: [{ expiryDate: null }, { expiryDate: { gte: now } }] }),
    },
    orderBy: [{ expiryDate: "asc" }, { receivedAt: "asc" }],
    include: {
      product: { select: { id: true, name: true, slug: true } },
      warehouse: { select: { id: true, code: true, name: true } },
    },
    take: 500,
  })
}

export const createInventoryLot = async (input: {
  productId: string
  warehouseId: string
  variantId?: string | null
  batchNo: string
  mfgDate?: Date | null
  expiryDate?: Date | null
  qtyReceived: number
  costPerUnit?: number | null
  notes?: string
}) => {
  return prisma.$transaction(async (tx) => {
    const lot = await tx.inventoryStockLot.create({
      data: {
        productId: input.productId,
        warehouseId: input.warehouseId,
        variantId: input.variantId ?? undefined,
        batchNo: input.batchNo.trim(),
        mfgDate: input.mfgDate ?? null,
        expiryDate: input.expiryDate ?? null,
        qtyReceived: input.qtyReceived,
        qtyAvailable: input.qtyReceived,
        costPerUnit: input.costPerUnit ?? null,
      },
    })

    await tx.inventoryMovement.create({
      data: {
        lotId: lot.id,
        movementType: "in",
        quantity: input.qtyReceived,
        referenceType: "lot_receipt",
        referenceId: lot.id,
        notes: input.notes?.trim() || null,
      },
    })

    await tx.inventoryItem.upsert({
      where: {
        id: `${input.productId}:${input.warehouseId}`,
      },
      create: {
        id: `${input.productId}:${input.warehouseId}`,
        productId: input.productId,
        warehouse: input.warehouseId,
        available: input.qtyReceived,
        reserved: 0,
      },
      update: {
        available: { increment: input.qtyReceived },
      },
    }).catch(async () => {
      // Compatibility fallback for legacy IDs not keyed as productId:warehouseId.
      await tx.inventoryItem.updateMany({
        where: { productId: input.productId, warehouse: input.warehouseId },
        data: { available: { increment: input.qtyReceived } },
      })
    })

    return lot
  })
}

export const fifoAllocateLots = async (input: {
  productId: string
  requiredQty: number
  warehouseId?: string
}) => {
  const lots = await prisma.inventoryStockLot.findMany({
    where: {
      productId: input.productId,
      qtyAvailable: { gt: 0 },
      ...(input.warehouseId ? { warehouseId: input.warehouseId } : {}),
      OR: [{ expiryDate: null }, { expiryDate: { gte: new Date() } }],
    },
    orderBy: [{ expiryDate: "asc" }, { receivedAt: "asc" }],
  })

  let remaining = input.requiredQty
  const allocations: Array<{ lotId: string; quantity: number }> = []
  for (const lot of lots) {
    if (remaining <= 0) break
    const take = Math.min(remaining, lot.qtyAvailable)
    if (take <= 0) continue
    allocations.push({ lotId: lot.id, quantity: take })
    remaining -= take
  }
  return {
    allocations,
    fulfilledQty: input.requiredQty - remaining,
    isFull: remaining === 0,
  }
}
