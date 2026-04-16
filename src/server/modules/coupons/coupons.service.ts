import { prisma } from "@/src/server/db/prisma"

export const listCoupons = async () => {
  return prisma.coupon.findMany({ orderBy: { createdAt: "desc" } })
}

export const createCoupon = async (input: {
  code: string
  discountType: "percent" | "fixed"
  discountValue: number
  active?: boolean
  startsAt?: Date | null
  endsAt?: Date | null
}) => {
  return prisma.coupon.create({
    data: {
      code: input.code.trim().toUpperCase(),
      discountType: input.discountType,
      discountValue: input.discountValue,
      active: input.active ?? true,
      startsAt: input.startsAt ?? undefined,
      endsAt: input.endsAt ?? undefined,
    },
  })
}

export const createCouponsBulk = async (input: {
  prefix: string
  count: number
  discountType: "percent" | "fixed"
  discountValue: number
  active?: boolean
  startsAt?: Date | null
  endsAt?: Date | null
  usageLimitTotal?: number | null
  usageLimitPerUser?: number | null
}) => {
  const now = Date.now().toString(36).toUpperCase()
  const codes = Array.from({ length: input.count }).map((_, idx) =>
    `${input.prefix.trim().toUpperCase()}-${now}-${String(idx + 1).padStart(4, "0")}`,
  )
  await prisma.coupon.createMany({
    data: codes.map((code) => ({
      code,
      discountType: input.discountType,
      discountValue: input.discountValue,
      active: input.active ?? true,
      startsAt: input.startsAt ?? null,
      endsAt: input.endsAt ?? null,
      usageLimitTotal: input.usageLimitTotal ?? null,
      usageLimitPerUser: input.usageLimitPerUser ?? null,
    })),
    skipDuplicates: true,
  })
  return prisma.coupon.findMany({
    where: { code: { in: codes } },
    orderBy: { code: "asc" },
  })
}

export const updateCoupon = async (
  id: string,
  input: Partial<{
    active: boolean
    discountType: "percent" | "fixed"
    discountValue: number
    startsAt: Date | null
    endsAt: Date | null
  }>,
) => {
  return prisma.coupon.update({ where: { id }, data: input })
}

/** Returns discount amount (not final total). */
export const computeCouponDiscount = async (code: string, subtotal: number) => {
  const c = await prisma.coupon.findUnique({
    where: { code: code.trim().toUpperCase() },
  })
  if (!c || !c.active) throw new Error("Invalid or inactive coupon")

  const now = new Date()
  if (c.startsAt && c.startsAt > now) throw new Error("Coupon not yet valid")
  if (c.endsAt && c.endsAt < now) throw new Error("Coupon expired")

  let discount = 0
  if (c.discountType === "percent") {
    discount = subtotal * (Number(c.discountValue) / 100)
  } else {
    discount = Number(c.discountValue)
  }

  discount = Math.min(Math.max(discount, 0), subtotal)
  return { discount, couponCode: c.code }
}
