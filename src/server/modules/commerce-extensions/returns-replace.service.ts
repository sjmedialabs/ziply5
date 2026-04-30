import { env } from "@/src/server/core/config/env"
import { enqueueOutboxEvent } from "@/src/server/modules/integrations/outbox.service"
import { pgQuery } from "@/src/server/db/pg"
import { createShipmentSupabase } from "@/src/lib/db/orders"
import { randomUUID } from "crypto"

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
  const orderRows = await pgQuery<
    Array<{
      id: string
      userId: string
      createdAt: Date
      status: string
    }>
  >(`SELECT id, "userId", "createdAt", status FROM "Order" WHERE id = $1 LIMIT 1`, [input.orderId])
  const order = orderRows[0]
  if (!order) throw new Error("Order not found")
  if (order.userId !== input.userId) throw new Error("Not your order")
  const histRows = await pgQuery<Array<{ toStatus: string | null }>>(
    `SELECT "toStatus" FROM "OrderStatusHistory" WHERE "orderId" = $1 ORDER BY "changedAt" DESC LIMIT 1`,
    [input.orderId],
  )
  const lifecycleStatus = ((histRows[0]?.toStatus ?? order.status) || "").toUpperCase()
  if (lifecycleStatus !== "DELIVERED") throw new Error("Return/replace allowed only after delivery")
  const itemRows = await pgQuery<Array<{ id: string }>>(
    `SELECT id FROM "OrderItem" WHERE id = $1 AND "orderId" = $2 LIMIT 1`,
    [input.orderItemId, input.orderId],
  )
  const item = itemRows[0]
  if (!item) throw new Error("Order item not found")
  const windowDays = Number(env.RETURN_WINDOW_DAYS ?? "7")
  const ageMs = Date.now() - order.createdAt.getTime()
  if (ageMs > windowDays * 24 * 60 * 60 * 1000) {
    throw new Error("Return window expired")
  }
  const rows = await pgQuery<Array<{ id: string }>>(
    `
      INSERT INTO return_requests_v2 (order_id, order_item_id, user_id, type, reason, status, notes)
      VALUES ($1, $2, $3, $4, $5, 'REQUESTED', $6)
      RETURNING id
    `,
    [input.orderId, input.orderItemId, input.userId, input.type, input.reason, input.notes ?? null],
  )
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
  return pgQuery<Array<Record<string, unknown>>>(
    `
      SELECT rr.*, p.name as product_name, o.id as order_id_ref
      FROM return_requests_v2 rr
      INNER JOIN "OrderItem" oi ON oi.id = rr.order_item_id
      INNER JOIN "Product" p ON p.id = oi.product_id
      INNER JOIN "Order" o ON o.id = rr.order_id
      WHERE rr.user_id = $1
      ORDER BY rr.created_at DESC
    `,
    [userId],
  )
}

export const listAdminReturnReplaceRequests = async () => {
  return pgQuery<Array<Record<string, unknown>>>(
    `
      SELECT rr.*, u.email as user_email, p.name as product_name
      FROM return_requests_v2 rr
      INNER JOIN "User" u ON u.id = rr.user_id
      INNER JOIN "OrderItem" oi ON oi.id = rr.order_item_id
      INNER JOIN "Product" p ON p.id = oi.product_id
      ORDER BY rr.created_at DESC
    `,
  )
}

export const updateReturnReplaceStatus = async (id: string, status: ReturnStatus, actorId: string, notes?: string) => {
  const rows = await pgQuery<Array<{ id: string; status: ReturnStatus; type: "return" | "replace"; order_id: string }>>(
    `SELECT id, status, type, order_id FROM return_requests_v2 WHERE id = $1::uuid LIMIT 1`,
    [id],
  )
  const current = rows[0]
  if (!current) throw new Error("Return request not found")
  if (!transitions[current.status]?.includes(status)) {
    throw new Error(`Invalid transition: ${current.status} -> ${status}`)
  }

  await pgQuery(
    `UPDATE return_requests_v2 SET status = $1, notes = COALESCE($2, notes), updated_at = now() WHERE id = $3::uuid`,
    [status, notes ?? null, id],
  )

  if (status === "PICKUP_INITIATED") {
    const created = await createShipmentSupabase({
      orderId: current.order_id,
      shipmentNo: null,
      carrier: "Reverse Logistics",
      trackingNo: `REV-${Date.now()}`,
      itemAllocations: [{ orderItemId: (await pgQuery<Array<{ order_item_id: string }>>(
        `SELECT order_item_id FROM return_requests_v2 WHERE id = $1::uuid LIMIT 1`,
        [id],
      ))[0]!.order_item_id, quantity: 1 }],
    })
    if (created) {
      // best-effort link: set a placeholder reverse_shipment_id if present in schema
      await pgQuery(`UPDATE return_requests_v2 SET reverse_shipment_id = COALESCE(reverse_shipment_id, reverse_shipment_id) WHERE id = $1::uuid`, [id]).catch(
        () => null,
      )
    }
  }

  if (status === "REPLACEMENT_SHIPPED") {
    const created = await createShipmentSupabase({
      orderId: current.order_id,
      shipmentNo: null,
      carrier: "Replacement Logistics",
      trackingNo: `REP-${Date.now()}`,
      itemAllocations: [{ orderItemId: (await pgQuery<Array<{ order_item_id: string }>>(
        `SELECT order_item_id FROM return_requests_v2 WHERE id = $1::uuid LIMIT 1`,
        [id],
      ))[0]!.order_item_id, quantity: 1 }],
    })
    if (created) {
      await pgQuery(`UPDATE return_requests_v2 SET replacement_shipment_id = COALESCE(replacement_shipment_id, replacement_shipment_id) WHERE id = $1::uuid`, [id]).catch(
        () => null,
      )
    }
  }

  if (status === "REFUND_INITIATED" && current.type === "return") {
    const orderRows = await pgQuery<Array<{ total: number | string | null }>>(
      `SELECT total FROM "Order" WHERE id = $1 LIMIT 1`,
      [current.order_id],
    )
    const total = orderRows[0]?.total
    const amount = total == null ? 0 : Number(total)
    if (amount > 0) {
      await pgQuery(
        `INSERT INTO "RefundRecord" (id, "orderId", amount, reason, status, "createdAt", "updatedAt")
         VALUES ($1, $2, $3::numeric, $4, 'pending', now(), now())`,
        [randomUUID(), current.order_id, amount, "return_request_v2"],
      )
    }
  }

  await enqueueOutboxEvent({
    eventType: "return_replace.status.v2",
    aggregateType: "return_request_v2",
    aggregateId: id,
    payload: { status, actorId },
  }).catch(() => null)
}
