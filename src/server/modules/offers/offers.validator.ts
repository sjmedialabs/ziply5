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

export const createOfferSchema = z.object({
  type: offerTypeSchema,
  name: z.string().min(2),
  code: z.string().min(2).max(64).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  status: offerStatusSchema.optional(),
  priority: z.number().int().min(0).max(10000).optional(),
  stackable: z.boolean().optional(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  config: z.record(z.string(), z.any()).default({}),
  targets: z.array(offerTargetSchema).default([]),
})

export const updateOfferSchema = createOfferSchema.partial()

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

