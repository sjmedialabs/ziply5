import { Prisma } from "@prisma/client"
import { prisma } from "@/src/server/db/prisma"

export const listProductDiscounts = async (productId?: string) => {
  return prisma.$queryRaw<Array<{
    id: string
    product_id: string
    discount_type: string
    discount_value: number
    start_date: Date | null
    end_date: Date | null
    is_stackable: boolean
    created_at: Date
  }>>(Prisma.sql`
    SELECT *
    FROM product_discounts_v2
    WHERE (${productId ?? null}::text IS NULL OR product_id = ${productId ?? null})
    ORDER BY created_at DESC
  `)
}

export const createProductDiscount = async (input: {
  productId: string
  discountType: "percentage" | "flat"
  discountValue: number
  startDate?: string | null
  endDate?: string | null
  isStackable?: boolean
}) => {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    INSERT INTO product_discounts_v2 (
      product_id, discount_type, discount_value, start_date, end_date, is_stackable
    )
    VALUES (
      ${input.productId}, ${input.discountType}, ${input.discountValue},
      ${input.startDate ? new Date(input.startDate) : null},
      ${input.endDate ? new Date(input.endDate) : null},
      ${input.isStackable ?? false}
    )
    RETURNING id
  `)
  return rows[0]?.id
}

export const updateProductDiscount = async (
  id: string,
  input: Partial<{
    discountType: "percentage" | "flat"
    discountValue: number
    startDate: string | null
    endDate: string | null
    isStackable: boolean
  }>,
) => {
  const sets: Prisma.Sql[] = []
  if (input.discountType !== undefined) sets.push(Prisma.sql`discount_type = ${input.discountType}`)
  if (input.discountValue !== undefined) sets.push(Prisma.sql`discount_value = ${input.discountValue}`)
  if (input.startDate !== undefined) sets.push(Prisma.sql`start_date = ${input.startDate ? new Date(input.startDate) : null}`)
  if (input.endDate !== undefined) sets.push(Prisma.sql`end_date = ${input.endDate ? new Date(input.endDate) : null}`)
  if (input.isStackable !== undefined) sets.push(Prisma.sql`is_stackable = ${input.isStackable}`)
  sets.push(Prisma.sql`updated_at = now()`)
  await prisma.$executeRaw(Prisma.sql`
    UPDATE product_discounts_v2
    SET ${Prisma.join(sets, Prisma.sql`, `)}
    WHERE id = ${id}::uuid
  `)
}

export const getActiveProductDiscount = async (productId: string, now = new Date()) => {
  const rows = await prisma.$queryRaw<Array<{
    id: string
    discount_type: "percentage" | "flat"
    discount_value: number
    is_stackable: boolean
  }>>(Prisma.sql`
    SELECT id, discount_type, discount_value, is_stackable
    FROM product_discounts_v2
    WHERE product_id = ${productId}
      AND (start_date IS NULL OR start_date <= ${now})
      AND (end_date IS NULL OR end_date >= ${now})
    ORDER BY created_at DESC
    LIMIT 1
  `)
  return rows[0] ?? null
}

export const applyProductDiscount = (basePrice: number, discount: { discount_type: "percentage" | "flat"; discount_value: number } | null) => {
  if (!discount) return { discountedPrice: basePrice, discountAmount: 0 }
  const rawDiscount =
    discount.discount_type === "percentage"
      ? (basePrice * Number(discount.discount_value)) / 100
      : Number(discount.discount_value)
  const discountAmount = Math.min(Math.max(rawDiscount, 0), basePrice)
  const discountedPrice = Math.max(0, basePrice - discountAmount)
  return { discountedPrice, discountAmount }
}
