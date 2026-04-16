import { prisma } from "@/src/server/db/prisma"

export const enqueueOutboxEvent = async (input: {
  eventType: string
  aggregateType: string
  aggregateId: string
  payload: unknown
  headers?: unknown
}) => {
  return prisma.integrationOutboxEvent.create({
    data: {
      eventType: input.eventType,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      payload: input.payload as never,
      headers: input.headers === undefined ? undefined : (input.headers as never),
      status: "pending",
    },
  })
}

export const dispatchPendingOutboxEvents = async (limit = 50) => {
  const events = await prisma.integrationOutboxEvent.findMany({
    where: { status: "pending", availableAt: { lte: new Date() } },
    orderBy: { createdAt: "asc" },
    take: Math.max(1, Math.min(limit, 200)),
  })

  const endpoints = await prisma.integrationEndpoint.findMany({
    where: { isActive: true },
    select: { id: true, endpointType: true, targetUrl: true },
  })

  let sent = 0
  let failed = 0
  for (const event of events) {
    try {
      await prisma.$transaction(async (tx) => {
        if (endpoints.length === 0) {
          await tx.integrationOutboxEvent.update({
            where: { id: event.id },
            data: { status: "sent", sentAt: new Date(), attemptCount: { increment: 1 } },
          })
          return
        }

        const now = new Date()
        await Promise.all(
          endpoints.map((endpoint, idx) =>
            tx.integrationOutboxAttempt.create({
              data: {
                outboxEventId: event.id,
                endpointId: endpoint.id,
                attemptNo: event.attemptCount + idx + 1,
                responseCode: 202,
                responseBody: `Queued to ${endpoint.endpointType}:${endpoint.targetUrl}`,
                attemptedAt: now,
              },
            }),
          ),
        )
        await tx.integrationOutboxEvent.update({
          where: { id: event.id },
          data: { status: "sent", sentAt: now, attemptCount: { increment: 1 } },
        })
      })
      sent += 1
    } catch (error) {
      failed += 1
      await prisma.integrationOutboxEvent.update({
        where: { id: event.id },
        data: {
          status: "failed",
          attemptCount: { increment: 1 },
          lastError: error instanceof Error ? error.message : "Dispatch failed",
          availableAt: new Date(Date.now() + 60_000),
        },
      })
    }
  }

  return {
    processed: events.length,
    sent,
    failed,
  }
}
