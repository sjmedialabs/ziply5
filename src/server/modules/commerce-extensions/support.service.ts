import { Prisma } from "@prisma/client"
import { prisma } from "@/src/server/db/prisma"
import { enqueueOutboxEvent } from "@/src/server/modules/integrations/outbox.service"

export const createSupportTicketV2 = async (input: {
  userId: string
  orderId?: string | null
  category: "order_issue" | "payment_issue" | "technical_issue"
  subject: string
  message: string
}) => {
  const ticketId = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      INSERT INTO support_tickets_v2 (user_id, order_id, category, subject, status)
      VALUES (${input.userId}, ${input.orderId ?? null}, ${input.category}, ${input.subject}, 'open')
      RETURNING id
    `)
    const id = rows[0]?.id
    if (!id) throw new Error("Failed to create support ticket")
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO support_messages_v2 (ticket_id, sender_type, message)
      VALUES (${id}::uuid, 'user', ${input.message})
    `)
    return id
  })
  await enqueueOutboxEvent({
    eventType: "support.ticket.created.v2",
    aggregateType: "support_ticket_v2",
    aggregateId: ticketId,
    payload: { ticketId, category: input.category, orderId: input.orderId ?? null },
  }).catch(() => null)
  return ticketId
}

export const listUserTicketsV2 = async (userId: string) => {
  return prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
    SELECT st.*, (
      SELECT sm.message FROM support_messages_v2 sm
      WHERE sm.ticket_id = st.id
      ORDER BY sm.created_at DESC
      LIMIT 1
    ) AS last_message
    FROM support_tickets_v2 st
    WHERE st.user_id = ${userId}
    ORDER BY st.updated_at DESC
  `)
}

export const listAdminTicketsV2 = async () => {
  return prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
    SELECT st.*, u.email as user_email, u.name as user_name
    FROM support_tickets_v2 st
    INNER JOIN "User" u ON u.id = st.user_id
    ORDER BY st.updated_at DESC
  `)
}

export const adminReplyTicketV2 = async (input: {
  ticketId: string
  message: string
  status?: "open" | "in_progress" | "resolved" | "closed"
}) => {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO support_messages_v2 (ticket_id, sender_type, message)
      VALUES (${input.ticketId}::uuid, 'admin', ${input.message})
    `)
    await tx.$executeRaw(Prisma.sql`
      UPDATE support_tickets_v2
      SET status = COALESCE(${input.status ?? null}, status), updated_at = now()
      WHERE id = ${input.ticketId}::uuid
    `)
  })
}

export const getTicketMessagesV2 = async (ticketId: string) => {
  return prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
    SELECT *
    FROM support_messages_v2
    WHERE ticket_id = ${ticketId}::uuid
    ORDER BY created_at ASC
  `)
}
