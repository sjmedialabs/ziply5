import { z } from "zod"

export const createOrderSchema = z.object({
  items: z.array(z.object({ slug: z.string().min(1), quantity: z.number().int().positive() })).min(1),
  shipping: z.number().nonnegative().optional(),
  currency: z.string().min(1).optional(),
  couponCode: z.string().optional(),
  gateway: z.string().min(1),
})

export const updateOrderStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "shipped", "delivered", "cancelled"]),
})
