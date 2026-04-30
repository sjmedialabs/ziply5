import { pgQuery } from "@/src/server/db/pg"
import { randomUUID } from "crypto"

export const logActivity = async (input: {
  actorId?: string | null
  action: string
  entityType: string
  entityId?: string | null
  metadata?: unknown
}) => {
  await pgQuery(
    `
      INSERT INTO "ActivityLog" (id, "actorId", action, "entityType", "entityId", metadata, "createdAt")
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, now())
    `,
    [
      randomUUID(),
      input.actorId ?? null,
      input.action,
      input.entityType,
      input.entityId ?? null,
      JSON.stringify(input.metadata ?? null),
    ],
  )
}
