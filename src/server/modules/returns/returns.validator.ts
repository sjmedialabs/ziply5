import { z } from "zod"

export const returnReasonCodeSchema = z.enum([
  "damaged",
  "expired",
  "wrong_item",
  "quality_issue",
  "late_delivery",
  "customer_remorse",
  "other",
])

export const settleReturnSchema = z.object({
  status: z.enum(["approved", "picked_up", "received", "rejected", "refunded"]),
  refundAmount: z.number().positive().optional(),
  reasonCode: returnReasonCodeSchema.optional(),
  reason: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
})

export const scheduleReturnPickupSchema = z.object({
  pickupDate: z.string().datetime(),
  timeSlot: z.string().max(120).optional(),
  carrier: z.string().max(120).optional(),
  trackingRef: z.string().max(120).optional(),
  notes: z.string().max(1000).optional(),
  items: z
    .array(
      z.object({
        orderItemId: z.string().min(1),
        requestedQty: z.number().int().positive(),
        reasonCode: returnReasonCodeSchema.optional(),
        notes: z.string().max(500).optional(),
      }),
    )
    .min(1),
})

export const recordReturnReceivingSchema = z.object({
  status: z.enum(["picked_up", "received"]),
  notes: z.string().max(1000).optional(),
  items: z
    .array(
      z.object({
        orderItemId: z.string().min(1),
        receivedQty: z.number().int().min(0),
        conditionStatus: z.enum(["good", "damaged", "expired", "rejected"]).optional(),
        notes: z.string().max(500).optional(),
      }),
    )
    .min(1),
})
