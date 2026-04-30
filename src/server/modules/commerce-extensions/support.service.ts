import { pgQuery, pgTx } from "@/src/server/db/pg"
import { enqueueOutboxEvent } from "@/src/server/modules/integrations/outbox.service"

export const createSupportTicketV2 = async (input: {
  userId: string
  orderId?: string | null
  category: "order_issue" | "payment_issue" | "technical_issue"
  subject: string
  message: string
}) => {
  const ticketId = await pgTx(async (client) => {
    const created = await client.query<{ id: string }>(
      `INSERT INTO support_tickets_v2 (user_id, order_id, category, subject, status)
       VALUES ($1, $2, $3, $4, 'open')
       RETURNING id`,
      [input.userId, input.orderId ?? null, input.category, input.subject],
    )
    const id = created.rows[0]?.id
    if (!id) throw new Error("Failed to create support ticket")
    await client.query(
      `INSERT INTO support_messages_v2 (ticket_id, sender_type, message)
       VALUES ($1::uuid, 'user', $2)`,
      [id, input.message],
    )
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
  return pgQuery<Array<Record<string, unknown>>>(
    `
      SELECT st.*, (
        SELECT sm.message FROM support_messages_v2 sm
        WHERE sm.ticket_id = st.id
        ORDER BY sm.created_at DESC
        LIMIT 1
      ) AS last_message
      FROM support_tickets_v2 st
      WHERE st.user_id = $1
      ORDER BY st.updated_at DESC
    `,
    [userId],
  )
}

export const listAdminTicketsV2 = async () => {
  return pgQuery<Array<Record<string, unknown>>>(
    `
      SELECT st.*, u.email as user_email, u.name as user_name
      FROM support_tickets_v2 st
      INNER JOIN "User" u ON u.id = st.user_id
      ORDER BY st.updated_at DESC
    `,
  )
}

export const adminReplyTicketV2 = async (input: {
  ticketId: string
  message: string
  status?: "open" | "in_progress" | "resolved" | "closed"
}) => {
  await pgTx(async (client) => {
    await client.query(
      `INSERT INTO support_messages_v2 (ticket_id, sender_type, message)
       VALUES ($1::uuid, 'admin', $2)`,
      [input.ticketId, input.message],
    )
    await client.query(
      `UPDATE support_tickets_v2
       SET status = COALESCE($1, status), updated_at = now()
       WHERE id = $2::uuid`,
      [input.status ?? null, input.ticketId],
    )
  })
}

export const getTicketMessagesV2 = async (ticketId: string) => {
  return pgQuery<Array<Record<string, unknown>>>(
    `
      SELECT *
      FROM support_messages_v2
      WHERE ticket_id = $1::uuid
      ORDER BY created_at ASC
    `,
    [ticketId],
  )
}
