import { pgQuery } from "@/src/server/db/pg"

export type TicketStatus = "open" | "in_progress" | "resolved" | "closed"

export const createTicket = async (createdById: string, subject: string) => {
  const rows = await pgQuery<
    Array<{ id: string; createdById: string; subject: string; status: TicketStatus; createdAt: Date; updatedAt: Date }>
  >(
    `
      INSERT INTO "Ticket" ("id", "createdById", subject, status, "createdAt", "updatedAt")
      VALUES (gen_random_uuid()::text, $1, $2, 'open', now(), now())
      RETURNING id, "createdById", subject, status, "createdAt", "updatedAt"
    `,
    [createdById, subject],
  )
  return rows[0]
}

export const listTickets = async (actorId: string, role: string) => {
  const isStaff = role === "admin" || role === "super_admin"
  const params: any[] = []
  const where = isStaff ? "" : (params.push(actorId), `WHERE t."createdById" = $${params.length}`)
  return pgQuery<
    Array<{
      id: string
      createdById: string
      subject: string
      status: TicketStatus
      createdAt: Date
      updatedAt: Date
      createdBy: { id: string; name: string | null; email: string }
    }>
  >(
    `
      SELECT
        t.id,
        t."createdById",
        t.subject,
        t.status,
        t."createdAt",
        t."updatedAt",
        jsonb_build_object('id', u.id, 'name', u.name, 'email', u.email) as "createdBy"
      FROM "Ticket" t
      INNER JOIN "User" u ON u.id = t."createdById"
      ${where}
      ORDER BY t."createdAt" DESC
    `,
    params,
  )
}

export const updateTicketStatus = async (id: string, status: TicketStatus) => {
  const rows = await pgQuery<
    Array<{
      id: string
      createdById: string
      subject: string
      status: TicketStatus
      createdAt: Date
      updatedAt: Date
      createdBy: { id: string; name: string | null; email: string }
    }>
  >(
    `
      UPDATE "Ticket" t
      SET status = $2, "updatedAt" = now()
      WHERE t.id = $1
      RETURNING
        t.id,
        t."createdById",
        t.subject,
        t.status,
        t."createdAt",
        t."updatedAt",
        (SELECT jsonb_build_object('id', u.id, 'name', u.name, 'email', u.email) FROM "User" u WHERE u.id = t."createdById") as "createdBy"
    `,
    [id, status],
  )
  return rows[0]
}
