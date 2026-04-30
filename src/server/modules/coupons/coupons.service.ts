import { pgQuery, pgTx } from "@/src/server/db/pg"
import { randomUUID } from "crypto"

export const listCoupons = async (role: string) => {

  const now = new Date()

  /* If customer → filter coupons */

  if (role === "customer") {

    return pgQuery(
      `
        SELECT *
        FROM "Coupon"
        WHERE active = true
          AND ("endsAt" IS NULL OR "endsAt" >= $1)
          AND ("startsAt" IS NULL OR "startsAt" <= $1)
        ORDER BY "createdAt" DESC
      `,
      [now],
    )

  }

  /* Admin → return all */

  return pgQuery(`SELECT * FROM "Coupon" ORDER BY "createdAt" DESC`)

}

export const createCoupon = async (input: {
  code: string
  discountType: "percentage" | "flat"
  discountValue: number
  description?: string | null

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

  const rows = await pgQuery(
    `
      INSERT INTO "Coupon" (
        id, code, "discountType", description, "discountValue", active, "startsAt", "endsAt",
        "minOrderAmount", "maxDiscountAmount", "usageLimitTotal", "usageLimitPerUser",
        stackable, "firstOrderOnly", "usedCount", "createdAt", "updatedAt"
      )
      VALUES ($1,$2,$3,$4,$5::numeric,$6,$7,$8,$9::numeric,$10::numeric,$11,$12,$13,$14,0,now(),now())
      RETURNING *
    `,
    [
      randomUUID(),
      input.code.trim().toUpperCase(),
      input.discountType === "percentage" ? "percent" : "fixed",
      input.description?.trim() || null,
      input.discountValue,
      input.active ?? true,
      input.startsAt ? new Date(input.startsAt) : null,
      input.endsAt ? new Date(input.endsAt) : null,
      input.minOrderAmount ?? null,
      input.maxDiscountAmount ?? null,
      input.usageLimitTotal ?? null,
      input.usageLimitPerUser ?? null,
      input.stackable ?? false,
      input.firstOrderOnly ?? false,
    ],
  )
  return rows[0]

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
  await pgTx(async (client) => {
    for (const code of codes) {
      await client.query(
        `
          INSERT INTO "Coupon" (
            id, code, "discountType", "discountValue", active, "startsAt", "endsAt",
            "usageLimitTotal", "usageLimitPerUser", "createdAt", "updatedAt"
          )
          VALUES ($1,$2,$3,$4::numeric,$5,$6,$7,$8,$9,now(),now())
          ON CONFLICT (code) DO NOTHING
        `,
        [
          randomUUID(),
          code,
          input.discountType,
          input.discountValue,
          input.active ?? true,
          input.startsAt ?? null,
          input.endsAt ?? null,
          input.usageLimitTotal ?? null,
          input.usageLimitPerUser ?? null,
        ],
      )
    }
  })
  return pgQuery(`SELECT * FROM "Coupon" WHERE code = ANY($1::text[]) ORDER BY code ASC`, [codes])
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

  const sets: string[] = []
  const values: any[] = []
  const push = (col: string, v: any) => {
    values.push(v)
    sets.push(`${col} = $${values.length}`)
  }
  if (input.code !== undefined) push(`code`, input.code)
  if (input.description !== undefined) push(`description`, input.description)
  if (input.active !== undefined) push(`active`, input.active)
  if (input.discountType !== undefined) push(`"discountType"`, input.discountType)
  if (input.discountValue !== undefined) push(`"discountValue"`, input.discountValue)
  if (input.startsAt !== undefined) push(`"startsAt"`, input.startsAt ? new Date(input.startsAt as any) : null)
  if (input.endsAt !== undefined) push(`"endsAt"`, input.endsAt ? new Date(input.endsAt as any) : null)
  if (input.minOrderAmount !== undefined) push(`"minOrderAmount"`, input.minOrderAmount)
  if (input.maxDiscountAmount !== undefined) push(`"maxDiscountAmount"`, input.maxDiscountAmount)
  if (input.usageLimitTotal !== undefined) push(`"usageLimitTotal"`, input.usageLimitTotal)
  if (input.usageLimitPerUser !== undefined) push(`"usageLimitPerUser"`, input.usageLimitPerUser)
  if (input.stackable !== undefined) push(`stackable`, input.stackable)
  if (input.firstOrderOnly !== undefined) push(`"firstOrderOnly"`, input.firstOrderOnly)
  sets.push(`"updatedAt" = now()`)
  values.push(id)
  const rows = await pgQuery(`UPDATE "Coupon" SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING *`, values)
  return rows[0]

}

/** Returns discount amount (not final total). */
export const computeCouponDiscount = async (
  code: string,
  subtotal: number
) => {

  const rows = await pgQuery<Array<any>>(`SELECT * FROM "Coupon" WHERE code = $1 LIMIT 1`, [code.trim().toUpperCase()])
  const c = rows[0]

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
