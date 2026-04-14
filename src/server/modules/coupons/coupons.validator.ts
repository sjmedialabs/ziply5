import { z } from "zod"

export const createCouponSchema = z.object({
  code: z.string().min(2),
  discountType: z.enum(["percent", "fixed"]),
  discountValue: z.number().positive(),
  active: z.boolean().optional(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
})

export const updateCouponSchema = z.object({
  active: z.boolean().optional(),
  discountType: z.enum(["percent", "fixed"]).optional(),
  discountValue: z.number().positive().optional(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
})

export const validateCouponSchema = z.object({
  code: z.string().min(1),
  subtotal: z.number().nonnegative(),
})
