import { pgQuery, pgTx } from "@/src/server/db/pg"
import { randomUUID } from "crypto"

export const enqueueOutboxEvent = async (input: {
  eventType: string
  aggregateType: string
  aggregateId: string
  payload: unknown
  headers?: unknown
}) => {
  const rows = await pgQuery<
    Array<{ id: string; eventType: string; aggregateType: string; aggregateId: string; status: string }>
  >(
    `
      INSERT INTO "IntegrationOutboxEvent" (
        id, "eventType", "aggregateType", "aggregateId", payload, headers, status, "availableAt", "attemptCount", "createdAt"
      )
      VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, 'pending', now(), 0, now())
      RETURNING id, "eventType", "aggregateType", "aggregateId", status
    `,
    [
      randomUUID(),
      input.eventType,
      input.aggregateType,
      input.aggregateId,
      JSON.stringify(input.payload ?? null),
      JSON.stringify(input.headers ?? null),
    ],
  )
  return rows[0]
}

export const dispatchPendingOutboxEvents = async (limit = 50) => {
  const events = await pgQuery<
    Array<{ id: string; attemptCount: number; eventType: string; aggregateType: string; aggregateId: string; payload: any; headers: any }>
  >(
    `
      SELECT id, "attemptCount" as "attemptCount", "eventType", "aggregateType", "aggregateId", payload, headers
      FROM "IntegrationOutboxEvent"
      WHERE status = 'pending' AND "availableAt" <= now()
      ORDER BY "createdAt" ASC
      LIMIT $1
    `,
    [Math.max(1, Math.min(limit, 200))],
  )

  const endpoints = await pgQuery<Array<{ id: string; endpointType: string; targetUrl: string }>>(
    `SELECT id, "endpointType", "targetUrl" FROM "IntegrationEndpoint" WHERE "isActive" = true`,
  )

  let sent = 0
  let failed = 0
  for (const event of events) {
    try {
      await pgTx(async (client) => {
        if (endpoints.length === 0) {
          await client.query(
            `UPDATE "IntegrationOutboxEvent" SET status='sent', "sentAt"=now(), "attemptCount"="attemptCount"+1 WHERE id=$1`,
            [event.id],
          )
          return
        }

        const now = new Date()
        for (const [idx, endpoint] of endpoints.entries()) {
          await client.query(
            `
              INSERT INTO "IntegrationOutboxAttempt" (id, "outboxEventId", "endpointId", "attemptNo", "responseCode", "responseBody", "attemptedAt")
              VALUES ($1, $2, $3, $4, 202, $5, $6)
            `,
            [
              randomUUID(),
              event.id,
              endpoint.id,
              (event.attemptCount ?? 0) + idx + 1,
              `Queued to ${endpoint.endpointType}:${endpoint.targetUrl}`,
              now,
            ],
          )
        }
        await client.query(
          `UPDATE "IntegrationOutboxEvent" SET status='sent', "sentAt"=$2, "attemptCount"="attemptCount"+1 WHERE id=$1`,
          [event.id, now],
        )
      })
      sent += 1
    } catch (error) {
      failed += 1
      await pgQuery(
        `
          UPDATE "IntegrationOutboxEvent"
          SET status='failed',
              "attemptCount"="attemptCount"+1,
              "lastError"=$2,
              "availableAt"=$3
          WHERE id=$1
        `,
        [event.id, error instanceof Error ? error.message : "Dispatch failed", new Date(Date.now() + 60_000)],
      )
    }
  }

  return {
    processed: events.length,
    sent,
    failed,
  }
}
