import { z } from "zod"

export const createReturnReplaceSchema = z.object({
  orderId: z.string().min(1),
  orderItemId: z.string().min(1),
  type: z.enum(["return", "replace"]),
  reason: z.string().min(2).max(300),
  notes: z.string().max(1000).optional().nullable(),
})

export const updateReturnReplaceStatusSchema = z.object({
  status: z.enum([
    "REQUESTED",
    "APPROVED",
    "PICKUP_INITIATED",
    "RECEIVED",
    "REFUND_INITIATED",
    "REPLACEMENT_SHIPPED",
    "COMPLETED",
    "REJECTED",
  ]),
  notes: z.string().max(1000).optional(),
})
