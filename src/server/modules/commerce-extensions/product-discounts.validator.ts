import { z } from "zod"

export const createProductDiscountSchema = z.object({
  productId: z.string().min(1),
  discountType: z.enum(["percentage", "flat"]),
  discountValue: z.number().positive(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  isStackable: z.boolean().optional(),
})

export const updateProductDiscountSchema = createProductDiscountSchema.partial()
