import { prisma } from "@/src/server/db/prisma"

export const listCoupons = async (role: string) => {

  const now = new Date()

  /* If customer → filter coupons */

  if (role === "customer") {

    return prisma.coupon.findMany({

      where: {

        active: true,

        /* Not expired */

        OR: [
          { endsAt: null },
          { endsAt: { gte: now } },
        ],

        /* Already started */

        AND: [
          {
            OR: [
              { startsAt: null },
              { startsAt: { lte: now } },
            ],
          },
        ],

      },

      orderBy: {
        createdAt: "desc",
      },

    })

  }

  /* Admin → return all */

  return prisma.coupon.findMany({

    orderBy: {
      createdAt: "desc",
    },

  })

}

export const createCoupon = async (input: {
  code: string
  discountType: "percentage" | "flat"
  discountValue: number

  active?: boolean
  startsAt?: string | null
  endsAt?: string | null

  minOrderAmount?: number | null
  maxDiscountAmount?: number | null

  usageLimitTotal?: number | null
  usageLimitPerUser?: number | null

  stackable?: boolean
  firstOrderOnly?: boolean
}) => {

  return prisma.coupon.create({

    data: {

      code: input.code.trim().toUpperCase(),

      discountType: input.discountType,

      discountValue: input.discountValue,

      active: input.active ?? true,

      /* Dates */

      startsAt: input.startsAt
        ? new Date(input.startsAt)
        : undefined,

      endsAt: input.endsAt
        ? new Date(input.endsAt)
        : undefined,

      /*  REQUIRED FIELD MAPPINGS */

      minOrderAmount:
        input.minOrderAmount ?? null,

      maxDiscountAmount:
        input.maxDiscountAmount ?? null,

      usageLimitTotal:
        input.usageLimitTotal ?? null,

      usageLimitPerUser:
        input.usageLimitPerUser ?? null,

      stackable:
        input.stackable ?? false,

      firstOrderOnly:
        input.firstOrderOnly ?? false,

      /* Always system-controlled */

      usedCount: 0,

      description:input.description?.trim() || null,

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

    code: string
    description: string | null


    active: boolean

    discountType: "percent" | "fixed"

    discountValue: number

    

    startsAt: string | Date | null

    endsAt: string | Date | null

    minOrderAmount: number | null

    maxDiscountAmount: number | null

    usageLimitTotal: number | null

    usageLimitPerUser: number | null

    stackable: boolean

    firstOrderOnly: boolean

  }>,
) => {

  return prisma.coupon.update({

    where: { id },

    data: {

      /* Existing fields */

      code: input.code,
      description: input.description,


      active: input.active,

      discountType: input.discountType,

      discountValue: input.discountValue,

     

      /* Dates (safe conversion) */

      startsAt:
        input.startsAt === undefined
          ? undefined
          : input.startsAt
            ? new Date(input.startsAt)
            : null,

      endsAt:
        input.endsAt === undefined
          ? undefined
          : input.endsAt
            ? new Date(input.endsAt)
            : null,

      /* New fields */

      minOrderAmount:
        input.minOrderAmount,

      maxDiscountAmount:
        input.maxDiscountAmount,

      usageLimitTotal:
        input.usageLimitTotal,

      usageLimitPerUser:
        input.usageLimitPerUser,

      stackable:
        input.stackable,

      firstOrderOnly:
        input.firstOrderOnly,

      /* Never allow manual update */

      usedCount: undefined,

    },

  })

}

/** Returns discount amount (not final total). */
export const computeCouponDiscount = async (
  code: string,
  subtotal: number
) => {

  const c = await prisma.coupon.findUnique({
    where: {
      code: code.trim().toUpperCase(),
    },
  })

  if (!c || !c.active)
    throw new Error("Invalid or inactive coupon")

  const now = new Date()

  /* Start Date Check */

  if (c.startsAt && c.startsAt > now)
    throw new Error("Coupon not yet valid")

  /* Expiry Check */

  if (c.endsAt && c.endsAt < now)
    throw new Error("Coupon expired")

  /* 🔥 Min Order Check */

  if (
    c.minOrderAmount &&
    subtotal < Number(c.minOrderAmount)
  ) {
    throw new Error(
      `Minimum order amount is ₹${c.minOrderAmount}`
    )
  }

  let discount = 0

  /* 🔥 Correct Discount Type */

  if (
    c.discountType === "percent" ||
    c.discountType === "percentage"
  ) {

    discount =
      subtotal *
      (Number(c.discountValue) / 100)

  } else {

    discount = Number(c.discountValue)

  }

  /* 🔥 Max Discount Cap */

  if (c.maxDiscountAmount) {

    discount = Math.min(
      discount,
      Number(c.maxDiscountAmount)
    )

  }

  /* Final safety */

  discount = Math.min(
    Math.max(discount, 0),
    subtotal
  )

  return {

    discount,

    couponCode: c.code,

  }

}
