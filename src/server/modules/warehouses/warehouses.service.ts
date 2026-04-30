import { pgQuery, pgTx } from "@/src/server/db/pg"
import { randomUUID } from "crypto"

export const listWarehouses = async () => {
  return pgQuery(`SELECT * FROM "Warehouse" WHERE "isActive" = true ORDER BY priority DESC, name ASC`)
}

export const createWarehouse = async (input: {
  code: string
  name: string
  region?: string
  city?: string
  state?: string
  postalCode?: string
}) => {
  const rows = await pgQuery(
    `
      INSERT INTO "Warehouse" (id, code, name, region, city, state, "postalCode", "isActive", priority, "createdAt", "updatedAt")
      VALUES ($1,$2,$3,$4,$5,$6,$7,true,0,now(),now())
      RETURNING *
    `,
    [
      randomUUID(),
      input.code.trim().toUpperCase(),
      input.name.trim(),
      input.region?.trim() || null,
      input.city?.trim() || null,
      input.state?.trim() || null,
      input.postalCode?.trim() || null,
    ],
  )
  return rows[0]
}

export const listInventoryLots = async (params?: {
  productId?: string
  warehouseId?: string
  includeExpired?: boolean
}) => {
  const now = new Date()
  const values: any[] = [params?.productId ?? null, params?.warehouseId ?? null, params?.includeExpired ? null : now]
  return pgQuery(
    `
      SELECT
        l.*,
        (SELECT jsonb_build_object('id', p.id, 'name', p.name, 'slug', p.slug) FROM "Product" p WHERE p.id = l."productId") as product,
        (SELECT jsonb_build_object('id', w.id, 'code', w.code, 'name', w.name) FROM "Warehouse" w WHERE w.id = l."warehouseId") as warehouse
      FROM "InventoryStockLot" l
      WHERE ($1::text IS NULL OR l."productId" = $1)
        AND ($2::text IS NULL OR l."warehouseId" = $2)
        AND ($3::timestamptz IS NULL OR l."expiryDate" IS NULL OR l."expiryDate" >= $3)
      ORDER BY l."expiryDate" ASC NULLS LAST, l."receivedAt" ASC
      LIMIT 500
    `,
    values,
  )
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
  return pgTx(async (client) => {
    const lotId = randomUUID()
    const lotRows = await client.query(
      `
        INSERT INTO "InventoryStockLot" (
          id, "productId", "warehouseId", "variantId", "batchNo", "mfgDate", "expiryDate",
          "qtyReceived", "qtyAvailable", "costPerUnit", "receivedAt", "createdAt", "updatedAt"
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8,$9,now(),now(),now())
        RETURNING *
      `,
      [
        lotId,
        input.productId,
        input.warehouseId,
        input.variantId ?? null,
        input.batchNo.trim(),
        input.mfgDate ?? null,
        input.expiryDate ?? null,
        input.qtyReceived,
        input.costPerUnit ?? null,
      ],
    )

    await client.query(
      `
        INSERT INTO "InventoryMovement" (id, "lotId", "movementType", quantity, "referenceType", "referenceId", notes, "createdAt")
        VALUES ($1,$2,'in',$3,'lot_receipt',$2,$4,now())
      `,
      [randomUUID(), lotId, input.qtyReceived, input.notes?.trim() || null],
    )

    await client.query(
      `
        INSERT INTO "InventoryItem" (id, "productId", warehouse, available, reserved, "createdAt", "updatedAt")
        VALUES ($1,$2,$3,$4,0,now(),now())
        ON CONFLICT (id) DO UPDATE
        SET available = "InventoryItem".available + EXCLUDED.available, "updatedAt" = now()
      `,
      [`${input.productId}:${input.warehouseId}`, input.productId, input.warehouseId, input.qtyReceived],
    )

    return lotRows.rows[0]
  })
}

export const fifoAllocateLots = async (input: {
  productId: string
  requiredQty: number
  warehouseId?: string
}) => {
  const lots = await pgQuery<Array<{ id: string; qtyAvailable: number }>>(
    `
      SELECT id, "qtyAvailable"
      FROM "InventoryStockLot"
      WHERE "productId" = $1
        AND "qtyAvailable" > 0
        AND ($2::text IS NULL OR "warehouseId" = $2)
        AND ("expiryDate" IS NULL OR "expiryDate" >= now())
      ORDER BY "expiryDate" ASC NULLS LAST, "receivedAt" ASC
    `,
    [input.productId, input.warehouseId ?? null],
  )

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
