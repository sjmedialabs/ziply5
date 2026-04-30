import { pgQuery } from "@/src/server/db/pg"
import { randomUUID } from "crypto"

export const listSettings = async (group?: string) => {
  return pgQuery<
    Array<{ id: string; group: string; key: string; valueJson: unknown; updatedAt: Date }>
  >(
    `
      SELECT id, "group", key, "valueJson", "updatedAt"
      FROM "Setting"
      WHERE ($1::text IS NULL OR "group" = $1)
      ORDER BY "group" ASC, key ASC
    `,
    [group ?? null],
  )
}

export const upsertSetting = async (input: { group: string; key: string; valueJson: unknown }) => {
  const rows = await pgQuery<
    Array<{ id: string; group: string; key: string; valueJson: unknown; updatedAt: Date }>
  >(
    `
      INSERT INTO "Setting" (id, "group", key, "valueJson", "updatedAt")
      VALUES ($1, $2, $3, $4::jsonb, now())
      ON CONFLICT ("group", key) DO UPDATE
      SET "valueJson" = EXCLUDED."valueJson", "updatedAt" = now()
      RETURNING id, "group", key, "valueJson", "updatedAt"
    `,
    [randomUUID(), input.group, input.key, JSON.stringify(input.valueJson ?? null)],
  )
  return rows[0]
}
