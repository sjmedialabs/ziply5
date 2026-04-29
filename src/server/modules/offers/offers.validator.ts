import { z } from "zod"

export const offerTypeSchema = z.enum([
  "coupon",
  "automatic",
  "product_discount",
  "cart_discount",
  "shipping_discount",
  "bogo",
])

export const offerStatusSchema = z.enum(["draft", "active", "inactive", "expired"])

export const offerTargetSchema = z.object({
  targetType: z.enum(["product", "category", "user", "segment", "location", "brand"]),
  targetId: z.string().min(1),
})

const discountTypeSchema = z.enum(["percentage", "flat"]).default("percentage")

const commonConfigSchema = z
  .object({
    discountType: discountTypeSchema.optional(),
    discountValue: z.number().finite().nonnegative().optional(),
    maxDiscountCap: z.number().finite().nonnegative().nullable().optional(),
    minCartValue: z.number().finite().nonnegative().optional(),
    usageLimitTotal: z.number().int().positive().nullable().optional(),
    usageLimitPerUser: z.number().int().positive().nullable().optional(),
    firstOrderOnly: z.boolean().optional(),
  })
  .passthrough()

const couponConfigSchema = commonConfigSchema.extend({
  discountType: discountTypeSchema,
  discountValue: z.number().finite().positive(),
  minCartValue: z.number().finite().nonnegative().default(0),
})

const automaticConfigSchema = commonConfigSchema.extend({
  discountType: discountTypeSchema.optional(),
  discountValue: z.number().finite().nonnegative().optional(),
  minCartValue: z.number().finite().nonnegative().default(0),
})

const cartDiscountConfigSchema = commonConfigSchema.extend({
  discountType: discountTypeSchema,
  discountValue: z.number().finite().positive(),
  minCartValue: z.number().finite().nonnegative().default(0),
})

const shippingDiscountConfigSchema = z
  .object({
    minCartValue: z.number().finite().nonnegative().default(0),
    mode: z.enum(["free", "flat", "percentage"]).default("free"),
    discountValue: z.number().finite().nonnegative().default(0),
  })
  .passthrough()

const bogoConfigSchema = z
  .object({
    buyQty: z.number().int().positive().default(2),
    getQty: z.number().int().positive().default(1),
    repeatable: z.boolean().default(true),
    maxFreeUnits: z.number().int().positive().nullable().optional(),
    rewardType: z.enum(["free", "percentage_off"]).default("free"),
    rewardValue: z.number().finite().nonnegative().default(0),
  })
  .passthrough()

const optionalDateTimeLike = () =>
  z
    .string()
    .trim()
    .refine((value) => Number.isFinite(new Date(value).getTime()), "Invalid datetime")
    .optional()
    .nullable()

const offerBaseSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).max(64).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  status: offerStatusSchema.optional(),
  priority: z.number().int().min(0).max(10000).optional(),
  stackable: z.boolean().optional(),
  // Accepts `datetime-local` (YYYY-MM-DDTHH:mm) and ISO strings.
  startsAt: optionalDateTimeLike(),
  endsAt: optionalDateTimeLike(),
  targets: z.array(offerTargetSchema).default([]),
})

export const createOfferSchema = z.discriminatedUnion("type", [
  offerBaseSchema.extend({ type: z.literal("coupon"), code: z.string().min(2).max(64), config: couponConfigSchema.default({} as any) }),
  offerBaseSchema.extend({ type: z.literal("automatic"), config: automaticConfigSchema.default({} as any) }),
  offerBaseSchema.extend({ type: z.literal("cart_discount"), config: cartDiscountConfigSchema.default({} as any) }),
  offerBaseSchema.extend({ type: z.literal("shipping_discount"), config: shippingDiscountConfigSchema.default({} as any) }),
  offerBaseSchema.extend({ type: z.literal("bogo"), config: bogoConfigSchema.default({} as any) }),
  // Backward-compat: product_discount can exist, but config remains flexible.
  offerBaseSchema.extend({ type: z.literal("product_discount"), config: commonConfigSchema.default({} as any) }),
])

// Update is intentionally permissive for backward-compat (older admin payloads / legacy configs).
// Type-specific validation is enforced on create; for updates we validate common shapes but allow extra keys.
export const updateOfferSchema = z
  .object({
    type: offerTypeSchema.optional(),
    name: z.string().min(2).optional(),
    code: z.string().min(2).max(64).nullable().optional(),
    description: z.string().max(1000).nullable().optional(),
    status: offerStatusSchema.optional(),
    priority: z.number().int().min(0).max(10000).optional(),
    stackable: z.boolean().optional(),
    startsAt: optionalDateTimeLike(),
    endsAt: optionalDateTimeLike(),
    config: z.record(z.string(), z.any()).optional(),
    targets: z.array(offerTargetSchema).optional(),
  })
  .passthrough()

export const calculateOffersSchema = z.object({
  userId: z.string().optional().nullable(),
  couponCode: z.string().optional().nullable(),
  items: z.array(
    z.object({
      productId: z.string(),
      categoryId: z.string().optional().nullable(),
      quantity: z.number().int().positive(),
      unitPrice: z.number().nonnegative(),
    }),
  ),
  shippingAmount: z.number().nonnegative().default(0),
  cartSubtotal: z.number().nonnegative(),
  context: z
    .object({
      paymentMethod: z.string().optional().nullable(),
      location: z.string().optional().nullable(),
      firstOrder: z.boolean().optional(),
    })
    .optional(),
})

