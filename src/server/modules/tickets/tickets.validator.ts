import { z } from "zod"

export const createTicketSchema = z.object({
  subject: z.string().min(3),
})

export const updateTicketSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved", "closed"]),
})
