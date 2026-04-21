import { z } from "zod"

export const createCouponV2Schema = z.object({
  code: z.string().trim().min(3).max(64),
  description: z.string().trim().optional().nullable(),
  discountType: z.enum(["percentage", "flat"]),
  discountValue: z.number().positive(),
  minOrderValue: z.number().min(0).optional(),
  maxDiscount: z.number().positive().optional().nullable(),
  usageLimit: z.number().int().positive().optional().nullable(),
  usagePerUser: z.number().int().positive().optional().nullable(),
  expiryDate: z.string().datetime().optional().nullable(),
  status: z.boolean().optional(),
  applicability: z
    .array(
      z.object({
        productId: z.string().optional().nullable(),
        categoryId: z.string().optional().nullable(),
      }),
    )
    .optional(),
})

export const updateCouponV2Schema = createCouponV2Schema.partial()

export const applyCouponV2Schema = z.object({
  code: z.string().trim().min(3).max(64),
  userId: z.string().optional().nullable(),
  subtotal: z.number().min(0),
  items: z
    .array(
      z.object({
        productId: z.string(),
        categoryId: z.string().optional().nullable(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
})
