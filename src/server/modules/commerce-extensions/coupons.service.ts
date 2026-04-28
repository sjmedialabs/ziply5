import { Prisma } from "@prisma/client"
import { prisma } from "@/src/server/db/prisma"

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
  return prisma.$queryRaw<Array<{
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
  }>>(Prisma.sql`
    SELECT *
    FROM coupons_v2
    WHERE deleted_at IS NULL
    ORDER BY created_at DESC
  `)
}

export const getCouponAnalyticsV2 = async (couponId: string) => {
  const [rows] = await Promise.all([
    prisma.$queryRaw<Array<{ used_count: bigint; distinct_users: bigint }>>(Prisma.sql`
      SELECT COUNT(*)::bigint as used_count, COUNT(DISTINCT user_id)::bigint as distinct_users
      FROM coupon_usage_v2
      WHERE coupon_id = ${couponId}::uuid
    `),
  ])
  return {
    usedCount: Number(rows[0]?.used_count ?? 0),
    distinctUsers: Number(rows[0]?.distinct_users ?? 0),
  }
}

export const createCouponV2 = async (input: CouponInput) => {
  return prisma.$transaction(async (tx) => {
    const created = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      INSERT INTO coupons_v2 (
        code, description, discount_type, discount_value,
        min_order_value, max_discount, usage_limit, usage_per_user, expiry_date, status
      )
      VALUES (
        ${input.code.trim().toUpperCase()},
        ${input.description ?? null},
        ${input.discountType},
        ${input.discountValue},
        ${input.minOrderValue ?? 0},
        ${input.maxDiscount ?? null},
        ${input.usageLimit ?? null},
        ${input.usagePerUser ?? null},
        ${input.expiryDate ? new Date(input.expiryDate) : null},
        ${input.status ?? true}
      )
      RETURNING id
    `)
    const couponId = created[0]?.id
    if (!couponId) throw new Error("Failed to create coupon")
    if (input.applicability?.length) {
      for (const row of input.applicability) {
        if (!row.productId && !row.categoryId) continue
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO coupon_applicability_v2 (coupon_id, product_id, category_id)
          VALUES (${couponId}::uuid, ${row.productId ?? null}, ${row.categoryId ?? null})
        `)
      }
    }
    await tx.coupon.upsert({
      where: { code: input.code.trim().toUpperCase() },
      create: {
        code: input.code.trim().toUpperCase(),
        discountType: input.discountType === "percentage" ? "percent" : "fixed",
        discountValue: input.discountValue,
        active: input.status ?? true,
        minOrderAmount: input.minOrderValue ?? null,
        maxDiscountAmount: input.maxDiscount ?? null,
        usageLimitTotal: input.usageLimit ?? null,
        usageLimitPerUser: input.usagePerUser ?? null,
        endsAt: input.expiryDate ? new Date(input.expiryDate) : null,
      },
      update: {
        discountType: input.discountType === "percentage" ? "percent" : "fixed",
        discountValue: input.discountValue,
        active: input.status ?? true,
        minOrderAmount: input.minOrderValue ?? null,
        maxDiscountAmount: input.maxDiscount ?? null,
        usageLimitTotal: input.usageLimit ?? null,
        usageLimitPerUser: input.usagePerUser ?? null,
        endsAt: input.expiryDate ? new Date(input.expiryDate) : null,
      },
    })
    return couponId
  })
}

export const updateCouponV2 = async (id: string, input: Partial<CouponInput>) => {
  await prisma.$transaction(async (tx) => {
    const sets: Prisma.Sql[] = []
    if (input.code !== undefined) sets.push(Prisma.sql`code = ${input.code.trim().toUpperCase()}`)
    if (input.description !== undefined) sets.push(Prisma.sql`description = ${input.description ?? null}`)
    if (input.discountType !== undefined) sets.push(Prisma.sql`discount_type = ${input.discountType}`)
    if (input.discountValue !== undefined) sets.push(Prisma.sql`discount_value = ${input.discountValue}`)
    if (input.minOrderValue !== undefined) sets.push(Prisma.sql`min_order_value = ${input.minOrderValue}`)
    if (input.maxDiscount !== undefined) sets.push(Prisma.sql`max_discount = ${input.maxDiscount ?? null}`)
    if (input.usageLimit !== undefined) sets.push(Prisma.sql`usage_limit = ${input.usageLimit ?? null}`)
    if (input.usagePerUser !== undefined) sets.push(Prisma.sql`usage_per_user = ${input.usagePerUser ?? null}`)
    if (input.expiryDate !== undefined) sets.push(Prisma.sql`expiry_date = ${input.expiryDate ? new Date(input.expiryDate) : null}`)
    if (input.status !== undefined) sets.push(Prisma.sql`status = ${input.status}`)
    sets.push(Prisma.sql`updated_at = now()`)
    await tx.$executeRaw(Prisma.sql`
      UPDATE coupons_v2
      SET ${Prisma.join(sets, Prisma.sql`, `)}
      WHERE id = ${id}::uuid
    `)

    if (input.applicability !== undefined) {
      await tx.$executeRaw(Prisma.sql`DELETE FROM coupon_applicability_v2 WHERE coupon_id = ${id}::uuid`)
      for (const row of input.applicability) {
        if (!row.productId && !row.categoryId) continue
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO coupon_applicability_v2 (coupon_id, product_id, category_id)
          VALUES (${id}::uuid, ${row.productId ?? null}, ${row.categoryId ?? null})
        `)
      }
    }
    const codeRow = await tx.$queryRaw<Array<{ code: string }>>(Prisma.sql`
      SELECT code FROM coupons_v2 WHERE id = ${id}::uuid LIMIT 1
    `)
    const code = codeRow[0]?.code
    if (code) {
      await tx.coupon.update({
        where: { code },
        data: {
          discountType:
            input.discountType === undefined
              ? undefined
              : input.discountType === "percentage"
                ? "percent"
                : "fixed",
          discountValue: input.discountValue,
          active: input.status,
          minOrderAmount: input.minOrderValue,
          maxDiscountAmount: input.maxDiscount === undefined ? undefined : input.maxDiscount ?? null,
          usageLimitTotal: input.usageLimit === undefined ? undefined : input.usageLimit ?? null,
          usageLimitPerUser: input.usagePerUser === undefined ? undefined : input.usagePerUser ?? null,
          endsAt: input.expiryDate === undefined ? undefined : input.expiryDate ? new Date(input.expiryDate) : null,
        },
      })
    }
  })
}

export const setCouponStatusV2 = async (id: string, status: boolean) => {
  await prisma.$executeRaw(Prisma.sql`
    UPDATE coupons_v2 SET status = ${status}, updated_at = now()
    WHERE id = ${id}::uuid AND deleted_at IS NULL
  `)
  const rows = await prisma.$queryRaw<Array<{ code: string }>>(Prisma.sql`
    SELECT code FROM coupons_v2 WHERE id = ${id}::uuid LIMIT 1
  `)
  const code = rows[0]?.code
  if (code) await prisma.coupon.update({ where: { code }, data: { active: status } }).catch(() => null)
}

export const softDeleteCouponV2 = async (id: string) => {
  await prisma.$executeRaw(Prisma.sql`
    UPDATE coupons_v2 SET deleted_at = now(), updated_at = now()
    WHERE id = ${id}::uuid AND deleted_at IS NULL
  `)
  const rows = await prisma.$queryRaw<Array<{ code: string }>>(Prisma.sql`
    SELECT code FROM coupons_v2 WHERE id = ${id}::uuid LIMIT 1
  `)
  const code = rows[0]?.code
  if (code) await prisma.coupon.update({ where: { code }, data: { active: false } }).catch(() => null)
}

export const applyCouponV2 = async (input: {
  code: string
  userId?: string | null
  subtotal: number
  items: Array<{ productId: string; categoryId?: string | null; quantity: number }>
}) => {
  const couponRows = await prisma.$queryRaw<Array<{
    id: string
    discount_type: "percentage" | "flat"
    discount_value: number
    min_order_value: number | null
    max_discount: number | null
    usage_limit: number | null
    usage_per_user: number | null
    expiry_date: Date | null
    status: boolean
  }>>(Prisma.sql`
    SELECT id, discount_type, discount_value, min_order_value, max_discount, usage_limit, usage_per_user, expiry_date, status
    FROM coupons_v2
    WHERE code = ${input.code.trim().toUpperCase()}
      AND deleted_at IS NULL
    LIMIT 1
  `)
  const coupon = couponRows[0]
  if (!coupon || !coupon.status) throw new Error("Invalid or inactive coupon")
  if (coupon.expiry_date && coupon.expiry_date.getTime() < Date.now()) throw new Error("Coupon expired")
  if (input.subtotal < Number(coupon.min_order_value ?? 0)) {
    throw new Error("Minimum order value not met")
  }

  const couponId = coupon.id
  const applicability = await prisma.$queryRaw<Array<{ product_id: string | null; category_id: string | null }>>(
    Prisma.sql`SELECT product_id, category_id FROM coupon_applicability_v2 WHERE coupon_id = ${couponId}::uuid`,
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

  const usageAgg = await prisma.$queryRaw<Array<{ used: bigint }>>(Prisma.sql`
    SELECT COALESCE(SUM(usage_count),0)::bigint as used
    FROM coupon_usage_v2
    WHERE coupon_id = ${couponId}::uuid
  `)
  const usedTotal = Number(usageAgg[0]?.used ?? 0)
  if (coupon.usage_limit != null && usedTotal >= Number(coupon.usage_limit)) {
    throw new Error("Coupon usage limit reached")
  }

  if (input.userId && coupon.usage_per_user != null) {
    const userAgg = await prisma.$queryRaw<Array<{ used: bigint }>>(Prisma.sql`
      SELECT COALESCE(SUM(usage_count),0)::bigint as used
      FROM coupon_usage_v2
      WHERE coupon_id = ${couponId}::uuid AND user_id = ${input.userId}
    `)
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
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO coupon_usage_v2 (coupon_id, user_id, order_id, usage_count)
    VALUES (${input.couponId}::uuid, ${input.userId}, ${input.orderId ?? null}, ${input.usageCount ?? 1})
  `)
}
