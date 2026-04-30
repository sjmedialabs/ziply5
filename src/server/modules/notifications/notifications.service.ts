import { pgQuery } from "@/src/server/db/pg"

export const listNotifications = async (userId: string) => {
  return pgQuery(`SELECT * FROM "Notification" WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT 50`, [userId])
}

export const markNotificationRead = async (id: string, userId: string) => {
  const found = await pgQuery<Array<{ id: string }>>(
    `SELECT id FROM "Notification" WHERE id = $1 AND "userId" = $2 LIMIT 1`,
    [id, userId],
  )
  if (!found[0]) throw new Error("Notification not found")
  const rows = await pgQuery(`UPDATE "Notification" SET "readAt" = now() WHERE id = $1 RETURNING *`, [id])
  return rows[0]
}
