import { z } from "zod"

export const createCouponSchema = z.object({

  code: z.string().min(2),

  discountType: z.enum([
    "percentage",
    "flat",
  ]),

  discountValue: z.number().positive(),

  active: z.boolean().optional(),

  startsAt: z.string().datetime().optional().nullable(),

  endsAt: z.string().datetime().optional().nullable(),

  /* NEW OPTIONAL FIELDS */

  minOrderAmount: z
    .number()
    .nonnegative()
    .optional()
    .nullable(),

  maxDiscountAmount: z
    .number()
    .nonnegative()
    .optional()
    .nullable(),

  usageLimitTotal: z
    .number()
    .int()
    .positive()
    .optional()
    .nullable(),

  usageLimitPerUser: z
    .number()
    .int()
    .positive()
    .optional()
    .nullable(),

  description: z.string().optional(),

  stackable: z.boolean().optional(),

  firstOrderOnly: z.boolean().optional(),

})

export const updateCouponSchema = z.object({

  code: z.string().min(2).optional(),

  description: z.string().optional(),


  active: z.boolean().optional(),

  discountType: z
    .enum(["percentage", "flat"])
    .optional(),

  discountValue: z
    .number()
    .positive()
    .optional(),

  startsAt: z
    .string()
    .datetime()
    .optional()
    .nullable(),

  endsAt: z
    .string()
    .datetime()
    .optional()
    .nullable(),

  /* ✅ NEW OPTIONAL FIELDS */

  minOrderAmount: z
    .number()
    .nonnegative()
    .optional()
    .nullable(),

  maxDiscountAmount: z
    .number()
    .nonnegative()
    .optional()
    .nullable(),

  usageLimitTotal: z
    .number()
    .int()
    .positive()
    .optional()
    .nullable(),

  usageLimitPerUser: z
    .number()
    .int()
    .positive()
    .optional()
    .nullable(),

  stackable: z.boolean().optional(),

  firstOrderOnly: z.boolean().optional(),

})

export const validateCouponSchema = z.object({

  code: z.string().min(1),

  subtotal: z.number().nonnegative(),

  userId: z.string().optional(),

})