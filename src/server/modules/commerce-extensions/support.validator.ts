import { z } from "zod"

export const createSupportTicketV2Schema = z.object({
  category: z.enum(["order_issue", "payment_issue", "technical_issue"]),
  subject: z.string().trim().min(3).max(180),
  message: z.string().trim().min(3).max(4000),
  orderId: z.string().optional().nullable(),
})

export const adminReplyV2Schema = z.object({
  ticketId: z.string().uuid(),
  status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
  message: z.string().trim().min(1).max(4000),
})
