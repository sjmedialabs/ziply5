import { z } from "zod"

export const createOrderSchema = z.object({
  items: z.array(
    z.object({
      slug: z.string().min(1),
      quantity: z.number().int().positive(),
    })
  ).min(1),

  shipping: z.number().nonnegative().optional(),
  currency: z.string().min(1).optional(),
  couponCode: z.string().optional(),
  gateway: z.string().min(1),

  // 🔥 NEW FIELDS
  billingAddress: z
    .object({
      fullName: z.string(),
      line1: z.string(),
      city: z.string(),
      state: z.string(),
      postalCode: z.string(),
      country: z.string(),
      phone: z.string().optional(),
    })
    .optional(),

  paymentStatus: z.enum(["pending", "paid", "failed"]).optional(),
  paymentId: z.string().optional(),
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

export const createShipmentSchema = z.object({
  shipmentNo: z.string().max(80).optional(),
  carrier: z.string().min(1).max(120),
  trackingNo: z.string().max(120).optional(),
  itemAllocations: z
    .array(
      z.object({
        orderItemId: z.string().min(1),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
})

export const reconcileCodSchema = z.object({
  collectedAmount: z.number().nonnegative(),
  settledAmount: z.number().nonnegative().optional(),
  status: z.enum(["pending", "partial", "settled", "failed"]).optional(),
  notes: z.string().max(1000).optional(),
})

export const confirmDeliverySchema = z.object({
  shipmentId: z.string().optional(),
  note: z.string().max(1000).optional(),
})
