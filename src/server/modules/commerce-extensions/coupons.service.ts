import { pgQuery, pgTx } from "@/src/server/db/pg"
import { randomUUID } from "crypto"

type CouponInput = {
  code: string
  description?: string | null
  discountType: "percentage" | "flat"
  discountValue: number
  minOrderValue?: number
  maxDiscount?: number | null
  usageLimit?: number | null
  usagePerUser?: number | null
  expiryDate?: string | null
  status?: boolean
  applicability?: Array<{ productId?: string | null; categoryId?: string | null }>
}

export const listCouponsV2 = async () => {
  return pgQuery<Array<{
    id: string
    code: string
    description: string | null
    discount_type: string
    discount_value: number
    min_order_value: number | null
    max_discount: number | null
    usage_limit: number | null
    usage_per_user: number | null
    expiry_date: Date | null
    status: boolean
    created_at: Date
    updated_at: Date
    deleted_at: Date | null
  }>>(
    `
      SELECT *
      FROM coupons_v2
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
    `,
  )
}

export const getCouponAnalyticsV2 = async (couponId: string) => {
  const rows = await pgQuery<Array<{ used_count: bigint; distinct_users: bigint }>>(
    `
      SELECT COUNT(*)::bigint as used_count, COUNT(DISTINCT user_id)::bigint as distinct_users
      FROM coupon_usage_v2
      WHERE coupon_id = $1::uuid
    `,
    [couponId],
  )
  return {
    usedCount: Number(rows[0]?.used_count ?? 0),
    distinctUsers: Number(rows[0]?.distinct_users ?? 0),
  }
}

const upsertLegacyCouponByCode = async (client: import("pg").PoolClient, input: CouponInput) => {
  const code = input.code.trim().toUpperCase()
  const legacyDiscountType = input.discountType === "percentage" ? "percent" : "fixed"
  const legacyRows = await client.query<{ id: string }>(
    `
      INSERT INTO "Coupon" (
        id, code, "discountType", description, "discountValue", active,
        "minOrderAmount", "maxDiscountAmount", "usageLimitTotal", "usageLimitPerUser", "endsAt", "updatedAt"
      )
      VALUES ($1, $2, $3, $4, $5::numeric, $6, $7::numeric, $8::numeric, $9, $10, $11, now())
      ON CONFLICT (code) DO UPDATE
      SET
        "discountType" = EXCLUDED."discountType",
        description = EXCLUDED.description,
        "discountValue" = EXCLUDED."discountValue",
        active = EXCLUDED.active,
        "minOrderAmount" = EXCLUDED."minOrderAmount",
        "maxDiscountAmount" = EXCLUDED."maxDiscountAmount",
        "usageLimitTotal" = EXCLUDED."usageLimitTotal",
        "usageLimitPerUser" = EXCLUDED."usageLimitPerUser",
        "endsAt" = EXCLUDED."endsAt",
        "updatedAt" = now()
      RETURNING id
    `,
    [
      randomUUID(),
      code,
      legacyDiscountType,
      input.description ?? null,
      input.discountValue,
      input.status ?? true,
      input.minOrderValue ?? null,
      input.maxDiscount ?? null,
      input.usageLimit ?? null,
      input.usagePerUser ?? null,
      input.expiryDate ? new Date(input.expiryDate) : null,
    ],
  )
  return legacyRows.rows[0]?.id ?? null
}

export const createCouponV2 = async (input: CouponInput) => {
  return pgTx(async (client) => {
    const created = await client.query<{ id: string }>(
      `
        INSERT INTO coupons_v2 (
          code, description, discount_type, discount_value,
          min_order_value, max_discount, usage_limit, usage_per_user, expiry_date, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `,
      [
        input.code.trim().toUpperCase(),
        input.description ?? null,
        input.discountType,
        input.discountValue,
        input.minOrderValue ?? 0,
        input.maxDiscount ?? null,
        input.usageLimit ?? null,
        input.usagePerUser ?? null,
        input.expiryDate ? new Date(input.expiryDate) : null,
        input.status ?? true,
      ],
    )
    const couponId = created.rows[0]?.id
    if (!couponId) throw new Error("Failed to create coupon")
    if (input.applicability?.length) {
      for (const row of input.applicability) {
        if (!row.productId && !row.categoryId) continue
        await client.query(
          `INSERT INTO coupon_applicability_v2 (coupon_id, product_id, category_id) VALUES ($1::uuid, $2, $3)`,
          [couponId, row.productId ?? null, row.categoryId ?? null],
        )
      }
    }
    await upsertLegacyCouponByCode(client, input).catch(() => null)
    return couponId
  })
}

export const updateCouponV2 = async (id: string, input: Partial<CouponInput>) => {
  await pgTx(async (client) => {
    const sets: string[] = []
    const values: any[] = []
    const push = (sql: string, v: any) => {
      values.push(v)
      sets.push(sql.replace("?", `$${values.length}`))
    }
    if (input.code !== undefined) push(`code = ?`, input.code.trim().toUpperCase())
    if (input.description !== undefined) push(`description = ?`, input.description ?? null)
    if (input.discountType !== undefined) push(`discount_type = ?`, input.discountType)
    if (input.discountValue !== undefined) push(`discount_value = ?`, input.discountValue)
    if (input.minOrderValue !== undefined) push(`min_order_value = ?`, input.minOrderValue)
    if (input.maxDiscount !== undefined) push(`max_discount = ?`, input.maxDiscount ?? null)
    if (input.usageLimit !== undefined) push(`usage_limit = ?`, input.usageLimit ?? null)
    if (input.usagePerUser !== undefined) push(`usage_per_user = ?`, input.usagePerUser ?? null)
    if (input.expiryDate !== undefined) push(`expiry_date = ?`, input.expiryDate ? new Date(input.expiryDate) : null)
    if (input.status !== undefined) push(`status = ?`, input.status)
    sets.push(`updated_at = now()`)
    values.push(id)
    await client.query(`UPDATE coupons_v2 SET ${sets.join(", ")} WHERE id = $${values.length}::uuid`, values)

    if (input.applicability !== undefined) {
      await client.query(`DELETE FROM coupon_applicability_v2 WHERE coupon_id = $1::uuid`, [id])
      for (const row of input.applicability) {
        if (!row.productId && !row.categoryId) continue
        await client.query(
          `INSERT INTO coupon_applicability_v2 (coupon_id, product_id, category_id) VALUES ($1::uuid, $2, $3)`,
          [id, row.productId ?? null, row.categoryId ?? null],
        )
      }
    }

    const codeRow = await client.query<{ code: string }>(`SELECT code FROM coupons_v2 WHERE id = $1::uuid LIMIT 1`, [id])
    const code = codeRow.rows[0]?.code
    if (code) {
      // Best-effort: reflect active status + values to legacy Coupon table.
      await client.query(
        `
          UPDATE "Coupon"
          SET
            "discountType" = COALESCE($2, "discountType"),
            "discountValue" = COALESCE($3::numeric, "discountValue"),
            active = COALESCE($4, active),
            "minOrderAmount" = COALESCE($5::numeric, "minOrderAmount"),
            "maxDiscountAmount" = COALESCE($6::numeric, "maxDiscountAmount"),
            "usageLimitTotal" = COALESCE($7, "usageLimitTotal"),
            "usageLimitPerUser" = COALESCE($8, "usageLimitPerUser"),
            "endsAt" = COALESCE($9, "endsAt"),
            "updatedAt" = now()
          WHERE code = $1
        `,
        [
          code,
          input.discountType === undefined ? null : input.discountType === "percentage" ? "percent" : "fixed",
          input.discountValue ?? null,
          input.status ?? null,
          input.minOrderValue ?? null,
          input.maxDiscount === undefined ? null : input.maxDiscount ?? null,
          input.usageLimit === undefined ? null : input.usageLimit ?? null,
          input.usagePerUser === undefined ? null : input.usagePerUser ?? null,
          input.expiryDate === undefined ? null : input.expiryDate ? new Date(input.expiryDate) : null,
        ],
      ).catch(() => null)
    }
  })
}

export const setCouponStatusV2 = async (id: string, status: boolean) => {
  await pgQuery(`UPDATE coupons_v2 SET status = $1, updated_at = now() WHERE id = $2::uuid AND deleted_at IS NULL`, [status, id])
  const rows = await pgQuery<Array<{ code: string }>>(`SELECT code FROM coupons_v2 WHERE id = $1::uuid LIMIT 1`, [id])
  const code = rows[0]?.code
  if (code) await pgQuery(`UPDATE "Coupon" SET active = $1, "updatedAt" = now() WHERE code = $2`, [status, code]).catch(() => null)
}

export const softDeleteCouponV2 = async (id: string) => {
  await pgQuery(
    `UPDATE coupons_v2 SET deleted_at = now(), updated_at = now() WHERE id = $1::uuid AND deleted_at IS NULL`,
    [id],
  )
  const rows = await pgQuery<Array<{ code: string }>>(`SELECT code FROM coupons_v2 WHERE id = $1::uuid LIMIT 1`, [id])
  const code = rows[0]?.code
  if (code) await pgQuery(`UPDATE "Coupon" SET active = false, "updatedAt" = now() WHERE code = $1`, [code]).catch(() => null)
}

export const applyCouponV2 = async (input: {
  code: string
  userId?: string | null
  subtotal: number
  items: Array<{ productId: string; categoryId?: string | null; quantity: number }>
}) => {
  const couponRows = await pgQuery<Array<{
    id: string
    discount_type: "percentage" | "flat"
    discount_value: number
    min_order_value: number | null
    max_discount: number | null
    usage_limit: number | null
    usage_per_user: number | null
    expiry_date: Date | null
    status: boolean
  }>>(
    `
      SELECT id, discount_type, discount_value, min_order_value, max_discount, usage_limit, usage_per_user, expiry_date, status
      FROM coupons_v2
      WHERE code = $1
        AND deleted_at IS NULL
      LIMIT 1
    `,
    [input.code.trim().toUpperCase()],
  )
  const coupon = couponRows[0]
  if (!coupon || !coupon.status) throw new Error("Invalid or inactive coupon")
  if (coupon.expiry_date && coupon.expiry_date.getTime() < Date.now()) throw new Error("Coupon expired")
  if (input.subtotal < Number(coupon.min_order_value ?? 0)) {
    throw new Error("Minimum order value not met")
  }

  const couponId = coupon.id
  const applicability = await pgQuery<Array<{ product_id: string | null; category_id: string | null }>>(
    `SELECT product_id, category_id FROM coupon_applicability_v2 WHERE coupon_id = $1::uuid`,
    [couponId],
  )
  if (applicability.length > 0) {
    const productIds = new Set(input.items.map((item) => item.productId))
    const categoryIds = new Set(input.items.map((item) => item.categoryId).filter(Boolean))
    const match = applicability.some((row) => {
      if (row.product_id && productIds.has(row.product_id)) return true
      if (row.category_id && categoryIds.has(row.category_id)) return true
      return false
    })
    if (!match) throw new Error("Coupon not applicable to selected products")
  }

  const usageAgg = await pgQuery<Array<{ used: bigint }>>(
    `SELECT COALESCE(SUM(usage_count),0)::bigint as used FROM coupon_usage_v2 WHERE coupon_id = $1::uuid`,
    [couponId],
  )
  const usedTotal = Number(usageAgg[0]?.used ?? 0)
  if (coupon.usage_limit != null && usedTotal >= Number(coupon.usage_limit)) {
    throw new Error("Coupon usage limit reached")
  }

  if (input.userId && coupon.usage_per_user != null) {
    const userAgg = await pgQuery<Array<{ used: bigint }>>(
      `SELECT COALESCE(SUM(usage_count),0)::bigint as used FROM coupon_usage_v2 WHERE coupon_id = $1::uuid AND user_id = $2`,
      [couponId, input.userId],
    )
    const usedByUser = Number(userAgg[0]?.used ?? 0)
    if (usedByUser >= Number(coupon.usage_per_user)) {
      throw new Error("Per-user coupon usage limit reached")
    }
  }

  let discount =
    coupon.discount_type === "percentage"
      ? (input.subtotal * Number(coupon.discount_value)) / 100
      : Number(coupon.discount_value)
  if (coupon.max_discount != null) discount = Math.min(discount, Number(coupon.max_discount))
  discount = Math.min(Math.max(discount, 0), input.subtotal)

  return {
    couponId,
    discount,
    finalSubtotal: input.subtotal - discount,
  }
}

export const markCouponUsageV2 = async (input: {
  couponId: string
  userId: string
  orderId?: string | null
  usageCount?: number
}) => {
  await pgQuery(
    `INSERT INTO coupon_usage_v2 (coupon_id, user_id, order_id, usage_count) VALUES ($1::uuid, $2, $3, $4)`,
    [input.couponId, input.userId, input.orderId ?? null, input.usageCount ?? 1],
  )
}
