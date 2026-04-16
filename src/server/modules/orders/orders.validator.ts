import { z } from "zod"

export const createOrderSchema = z.object({
  items: z.array(z.object({ slug: z.string().min(1), quantity: z.number().int().positive() })).min(1),
  shipping: z.number().nonnegative().optional(),
  currency: z.string().min(1).optional(),
  couponCode: z.string().optional(),
  gateway: z.string().min(1),
})

export const updateOrderStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "packed", "shipped", "delivered", "returned", "cancelled"]),
  reasonCode: z.string().max(80).optional(),
  note: z.string().max(1000).optional(),
})

export const createOrderNoteSchema = z.object({
  note: z.string().min(1).max(2000),
  isInternal: z.boolean().optional(),
})

export const createOrderInvoiceSchema = z.object({
  gstin: z.string().max(30).optional(),
  taxRate: z.number().min(0).max(1).optional(),
})
