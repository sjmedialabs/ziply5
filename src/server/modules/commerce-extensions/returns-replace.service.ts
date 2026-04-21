import { Prisma } from "@prisma/client"
import { prisma } from "@/src/server/db/prisma"
import { env } from "@/src/server/core/config/env"
import { enqueueOutboxEvent } from "@/src/server/modules/integrations/outbox.service"

type ReturnStatus =
  | "REQUESTED"
  | "APPROVED"
  | "PICKUP_INITIATED"
  | "RECEIVED"
  | "REFUND_INITIATED"
  | "REPLACEMENT_SHIPPED"
  | "COMPLETED"
  | "REJECTED"

const transitions: Record<ReturnStatus, ReturnStatus[]> = {
  REQUESTED: ["APPROVED", "REJECTED"],
  APPROVED: ["PICKUP_INITIATED", "REJECTED"],
  PICKUP_INITIATED: ["RECEIVED", "REJECTED"],
  RECEIVED: ["REFUND_INITIATED", "REPLACEMENT_SHIPPED", "REJECTED"],
  REFUND_INITIATED: ["COMPLETED"],
  REPLACEMENT_SHIPPED: ["COMPLETED"],
  COMPLETED: [],
  REJECTED: [],
}

export const createReturnReplaceRequest = async (input: {
  orderId: string
  orderItemId: string
  userId: string
  type: "return" | "replace"
  reason: string
  notes?: string | null
}) => {
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: { items: true, statusHistory: { orderBy: { changedAt: "desc" }, take: 1 } },
  })
  if (!order) throw new Error("Order not found")
  if (order.userId !== input.userId) throw new Error("Not your order")
  const lifecycleStatus = (order.statusHistory[0]?.toStatus ?? order.status).toUpperCase()
  if (lifecycleStatus !== "DELIVERED") throw new Error("Return/replace allowed only after delivery")
  const item = order.items.find((x) => x.id === input.orderItemId)
  if (!item) throw new Error("Order item not found")
  const windowDays = Number(env.RETURN_WINDOW_DAYS ?? "7")
  const ageMs = Date.now() - order.createdAt.getTime()
  if (ageMs > windowDays * 24 * 60 * 60 * 1000) {
    throw new Error("Return window expired")
  }
  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    INSERT INTO return_requests_v2 (order_id, order_item_id, user_id, type, reason, status, notes)
    VALUES (${input.orderId}, ${input.orderItemId}, ${input.userId}, ${input.type}, ${input.reason}, 'REQUESTED', ${input.notes ?? null})
    RETURNING id
  `)
  const id = rows[0]?.id
  if (!id) throw new Error("Failed to create request")
  await enqueueOutboxEvent({
    eventType: "return_replace.requested.v2",
    aggregateType: "return_request_v2",
    aggregateId: id,
    payload: { id, orderId: input.orderId, type: input.type },
  }).catch(() => null)
  return id
}

export const listMyReturnReplaceRequests = async (userId: string) => {
  return prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
    SELECT rr.*, p.name as product_name, o.id as order_id_ref
    FROM return_requests_v2 rr
    INNER JOIN "OrderItem" oi ON oi.id = rr.order_item_id
    INNER JOIN "Product" p ON p.id = oi.product_id
    INNER JOIN "Order" o ON o.id = rr.order_id
    WHERE rr.user_id = ${userId}
    ORDER BY rr.created_at DESC
  `)
}

export const listAdminReturnReplaceRequests = async () => {
  return prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
    SELECT rr.*, u.email as user_email, p.name as product_name
    FROM return_requests_v2 rr
    INNER JOIN "User" u ON u.id = rr.user_id
    INNER JOIN "OrderItem" oi ON oi.id = rr.order_item_id
    INNER JOIN "Product" p ON p.id = oi.product_id
    ORDER BY rr.created_at DESC
  `)
}

export const updateReturnReplaceStatus = async (id: string, status: ReturnStatus, actorId: string, notes?: string) => {
  const rows = await prisma.$queryRaw<Array<{ id: string; status: ReturnStatus; type: "return" | "replace"; order_id: string }>>(Prisma.sql`
    SELECT id, status, type, order_id
    FROM return_requests_v2
    WHERE id = ${id}::uuid
    LIMIT 1
  `)
  const current = rows[0]
  if (!current) throw new Error("Return request not found")
  if (!transitions[current.status]?.includes(status)) {
    throw new Error(`Invalid transition: ${current.status} -> ${status}`)
  }

  await prisma.$executeRaw(Prisma.sql`
    UPDATE return_requests_v2
    SET status = ${status}, notes = COALESCE(${notes ?? null}, notes), updated_at = now()
    WHERE id = ${id}::uuid
  `)

  if (status === "PICKUP_INITIATED") {
    const shipment = await prisma.shipment.create({
      data: {
        orderId: current.order_id,
        shipmentStatus: "pending",
        carrier: "Reverse Logistics",
        trackingNo: `REV-${Date.now()}`,
      },
    })
    await prisma.$executeRaw(Prisma.sql`
      UPDATE return_requests_v2
      SET reverse_shipment_id = ${shipment.id}
      WHERE id = ${id}::uuid
    `)
  }

  if (status === "REPLACEMENT_SHIPPED") {
    const shipment = await prisma.shipment.create({
      data: {
        orderId: current.order_id,
        shipmentStatus: "shipped",
        carrier: "Replacement Logistics",
        trackingNo: `REP-${Date.now()}`,
        shippedAt: new Date(),
      },
    })
    await prisma.$executeRaw(Prisma.sql`
      UPDATE return_requests_v2
      SET replacement_shipment_id = ${shipment.id}
      WHERE id = ${id}::uuid
    `)
  }

  if (status === "REFUND_INITIATED" && current.type === "return") {
    const order = await prisma.order.findUnique({ where: { id: current.order_id }, select: { total: true } })
    if (order) {
      await prisma.refundRecord.create({
        data: {
          orderId: current.order_id,
          amount: Number(order.total),
          reason: "return_request_v2",
          status: "pending",
        },
      })
    }
  }

  await enqueueOutboxEvent({
    eventType: "return_replace.status.v2",
    aggregateType: "return_request_v2",
    aggregateId: id,
    payload: { status, actorId },
  }).catch(() => null)
}
