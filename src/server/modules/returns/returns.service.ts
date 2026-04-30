import { pgQuery, pgTx } from "@/src/server/db/pg"
import { logActivity } from "@/src/server/modules/activity/activity.service"
import { enqueueOutboxEvent } from "@/src/server/modules/integrations/outbox.service"
import { updateOrderStatus } from "@/src/server/modules/orders/orders.service"
import { randomUUID } from "crypto"

type ReturnLifecycleStatus =
  | "requested"
  | "approved"
  | "picked_up"
  | "received"
  | "refunded"
  | "rejected"

const returnTransitions: Record<ReturnLifecycleStatus, ReturnLifecycleStatus[]> = {
  requested: ["approved", "rejected"],
  approved: ["picked_up", "received", "rejected", "refunded"],
  picked_up: ["received", "rejected"],
  received: ["refunded", "rejected"],
  refunded: [],
  rejected: [],
}

export const scheduleReturnPickup = async (input: {
  returnRequestId: string
  actorId: string
  pickupDate: Date
  timeSlot?: string
  carrier?: string
  trackingRef?: string
  notes?: string
  items: Array<{
    orderItemId: string
    requestedQty: number
    reasonCode?: "damaged" | "expired" | "wrong_item" | "quality_issue" | "late_delivery" | "customer_remorse" | "other"
    notes?: string
  }>
}) => {
  const reqRows = await pgQuery<
    Array<{
      id: string
      status: string
      orderId: string
      items: unknown
      order_items: unknown
    }>
  >(
    `
      SELECT
        rr.id,
        rr.status,
        rr."orderId" as "orderId",
        COALESCE((
          SELECT jsonb_agg(jsonb_build_object('orderItemId', i."orderItemId", 'requestedQty', i."requestedQty") ORDER BY i."createdAt" DESC)
          FROM "ReturnRequestItem" i
          WHERE i."returnRequestId" = rr.id
        ), '[]'::jsonb) as items,
        COALESCE((
          SELECT jsonb_agg(jsonb_build_object('id', oi.id, 'quantity', oi.quantity) ORDER BY oi.id ASC)
          FROM "OrderItem" oi
          WHERE oi."orderId" = rr."orderId"
        ), '[]'::jsonb) as order_items
      FROM "ReturnRequest" rr
      WHERE rr.id = $1
      LIMIT 1
    `,
    [input.returnRequestId],
  )
  const req = reqRows[0] as any
  if (!req) throw new Error("Return request not found")

  const current = (req.status || "requested") as ReturnLifecycleStatus
  if (!["requested", "approved"].includes(current)) {
    throw new Error(`Cannot schedule pickup when return is ${current}`)
  }
  const orderItems = Array.isArray(req.order_items) ? (req.order_items as any[]) : []
  const orderItemById = new Map(orderItems.map((i) => [i.id, i]))
  for (const item of input.items) {
    const orderItem = orderItemById.get(item.orderItemId)
    if (!orderItem) throw new Error(`Invalid order item: ${item.orderItemId}`)
    if (item.requestedQty > orderItem.quantity) {
      throw new Error(`Requested quantity exceeds order quantity for ${item.orderItemId}`)
    }
  }

  const result = await pgTx(async (tx) => {
    const pickupRows = await tx.query(
      `
        INSERT INTO "ReturnPickup" (id, "returnRequestId", "pickupDate", "timeSlot", carrier, "trackingRef", status, notes, "createdAt", "updatedAt")
        VALUES ($1,$2,$3,$4,$5,$6,'scheduled',$7,now(),now())
        ON CONFLICT ("returnRequestId") DO UPDATE SET
          "pickupDate"=EXCLUDED."pickupDate",
          "timeSlot"=EXCLUDED."timeSlot",
          carrier=EXCLUDED.carrier,
          "trackingRef"=EXCLUDED."trackingRef",
          status='scheduled',
          notes=EXCLUDED.notes,
          "updatedAt"=now()
        RETURNING *
      `,
      [
        randomUUID(),
        input.returnRequestId,
        input.pickupDate,
        input.timeSlot?.trim() || null,
        input.carrier?.trim() || null,
        input.trackingRef?.trim() || null,
        input.notes?.trim() || null,
      ],
    )
    const pickup = pickupRows.rows[0]

    for (const item of input.items) {
      await tx.query(
        `
          INSERT INTO "ReturnRequestItem" (
            id, "returnRequestId", "orderItemId", "requestedQty", "receivedQty", "reasonCode", notes, "createdAt", "updatedAt"
          )
          VALUES ($1,$2,$3,$4,0,$5,$6,now(),now())
          ON CONFLICT ("returnRequestId","orderItemId") DO UPDATE SET
            "requestedQty"=EXCLUDED."requestedQty",
            "reasonCode"=EXCLUDED."reasonCode",
            notes=EXCLUDED.notes,
            "updatedAt"=now()
        `,
        [randomUUID(), input.returnRequestId, item.orderItemId, item.requestedQty, item.reasonCode ?? null, item.notes?.trim() || null],
      )
    }

    const nextStatus: ReturnLifecycleStatus = current === "requested" ? "approved" : current
    if (nextStatus !== current) {
      await tx.query(`UPDATE "ReturnRequest" SET status=$2, "updatedAt"=now() WHERE id=$1`, [input.returnRequestId, nextStatus])
    }

    return pickup
  })

  await logActivity({
    actorId: input.actorId,
    action: "return.pickup.schedule",
    entityType: "ReturnRequest",
    entityId: input.returnRequestId,
    metadata: {
      pickupDate: input.pickupDate.toISOString(),
      items: input.items.length,
      carrier: input.carrier ?? null,
    },
  })
  await enqueueOutboxEvent({
    eventType: "return.pickup.scheduled",
    aggregateType: "return_request",
    aggregateId: input.returnRequestId,
    payload: {
      returnRequestId: input.returnRequestId,
      pickupId: result.id,
      pickupDate: result.pickupDate,
      itemCount: input.items.length,
    },
  }).catch(() => null)

  return result
}

export const recordReturnReceiving = async (input: {
  returnRequestId: string
  actorId: string
  status: "picked_up" | "received"
  notes?: string
  items: Array<{
    orderItemId: string
    receivedQty: number
    conditionStatus?: "good" | "damaged" | "expired" | "rejected"
    notes?: string
  }>
}) => {
  const reqRows = await pgQuery<
    Array<{
      id: string
      status: string
      orderId: string
      order_items: unknown
      items: unknown
      pickup: unknown
    }>
  >(
    `
      SELECT
        rr.id,
        rr.status,
        rr."orderId" as "orderId",
        COALESCE((
          SELECT jsonb_agg(jsonb_build_object('id', oi.id, 'quantity', oi.quantity) ORDER BY oi.id ASC)
          FROM "OrderItem" oi
          WHERE oi."orderId" = rr."orderId"
        ), '[]'::jsonb) as order_items,
        COALESCE((
          SELECT jsonb_agg(jsonb_build_object('orderItemId', i."orderItemId", 'requestedQty', i."requestedQty", 'receivedQty', i."receivedQty") ORDER BY i."createdAt" DESC)
          FROM "ReturnRequestItem" i
          WHERE i."returnRequestId" = rr.id
        ), '[]'::jsonb) as items,
        (
          SELECT to_jsonb(pu)
          FROM "ReturnPickup" pu
          WHERE pu."returnRequestId" = rr.id
          LIMIT 1
        ) as pickup
      FROM "ReturnRequest" rr
      WHERE rr.id = $1
      LIMIT 1
    `,
    [input.returnRequestId],
  )
  const req = reqRows[0] as any
  if (!req) throw new Error("Return request not found")
  const current = (req.status || "requested") as ReturnLifecycleStatus
  const target = input.status as ReturnLifecycleStatus
  if (!returnTransitions[current]?.includes(target)) {
    throw new Error(`Invalid return transition: ${current} -> ${target}`)
  }

  const orderItems = Array.isArray(req.order_items) ? (req.order_items as any[]) : []
  const items = Array.isArray(req.items) ? (req.items as any[]) : []
  const byOrderItemId = new Map(orderItems.map((i) => [i.id, i]))
  const byReturnItemId = new Map(items.map((i) => [i.orderItemId, i]))

  await pgTx(async (tx) => {
    for (const item of input.items) {
      const orderItem = byOrderItemId.get(item.orderItemId)
      if (!orderItem) throw new Error(`Invalid order item: ${item.orderItemId}`)
      const existing = byReturnItemId.get(item.orderItemId)
      const requestedQty = existing?.requestedQty ?? orderItem.quantity
      if (item.receivedQty > requestedQty) {
        throw new Error(`receivedQty exceeds requestedQty for ${item.orderItemId}`)
      }
      await tx.query(
        `
          INSERT INTO "ReturnRequestItem" (
            id, "returnRequestId", "orderItemId", "requestedQty", "receivedQty", "conditionStatus", notes, "createdAt", "updatedAt"
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,now(),now())
          ON CONFLICT ("returnRequestId","orderItemId") DO UPDATE SET
            "receivedQty"=EXCLUDED."receivedQty",
            "conditionStatus"=EXCLUDED."conditionStatus",
            notes=EXCLUDED.notes,
            "updatedAt"=now()
        `,
        [
          randomUUID(),
          input.returnRequestId,
          item.orderItemId,
          requestedQty,
          item.receivedQty,
          item.conditionStatus ?? null,
          item.notes?.trim() || null,
        ],
      )
    }

    await tx.query(`UPDATE "ReturnRequest" SET status=$2, "updatedAt"=now() WHERE id=$1`, [input.returnRequestId, input.status])
    if (req.pickup) {
      await tx.query(
        `UPDATE "ReturnPickup" SET status=$2, notes=COALESCE($3, notes), "updatedAt"=now() WHERE "returnRequestId"=$1`,
        [input.returnRequestId, input.status === "picked_up" ? "picked_up" : "received", input.notes?.trim() || null],
      )
    }
  })

  await logActivity({
    actorId: input.actorId,
    action: "return.receiving.record",
    entityType: "ReturnRequest",
    entityId: input.returnRequestId,
    metadata: {
      status: input.status,
      items: input.items.length,
    },
  })
  await enqueueOutboxEvent({
    eventType: "return.receiving.updated",
    aggregateType: "return_request",
    aggregateId: input.returnRequestId,
    payload: {
      returnRequestId: input.returnRequestId,
      status: input.status,
      items: input.items,
    },
  }).catch(() => null)

  const out = await pgQuery<Array<Record<string, unknown>>>(
    `SELECT * FROM "ReturnRequest" WHERE id=$1 LIMIT 1`,
    [input.returnRequestId],
  )
  return out[0] ?? null
}

export const settleReturnRequest = async (input: {
  returnRequestId: string
  actorId: string
  status: "approved" | "picked_up" | "received" | "rejected" | "refunded"
  refundAmount?: number
  reasonCode?: "damaged" | "expired" | "wrong_item" | "quality_issue" | "late_delivery" | "customer_remorse" | "other"
  reason?: string
  notes?: string
}) => {
  const reqRows = await pgQuery<
    Array<{ id: string; status: string; orderId: string; order_total: number }>
  >(
    `
      SELECT rr.id, rr.status, rr."orderId" as "orderId", o.total as order_total
      FROM "ReturnRequest" rr
      INNER JOIN "Order" o ON o.id = rr."orderId"
      WHERE rr.id = $1
      LIMIT 1
    `,
    [input.returnRequestId],
  )
  const req = reqRows[0]
  if (!req) throw new Error("Return request not found")

  const fromStatus = (req.status || "requested") as ReturnLifecycleStatus
  const toStatus = input.status as ReturnLifecycleStatus
  if (fromStatus === "refunded") throw new Error("Return request already refunded")
  if (fromStatus === toStatus) throw new Error(`Return request already in status ${toStatus}`)
  if (!returnTransitions[fromStatus]?.includes(toStatus)) {
    throw new Error(`Invalid return transition: ${fromStatus} -> ${toStatus}`)
  }

  const updated = await pgTx(async (tx) => {
    const rowRows = await tx.query(
      `UPDATE "ReturnRequest" SET status=$2, "updatedAt"=now() WHERE id=$1 RETURNING *`,
      [input.returnRequestId, input.status],
    )
    const row = rowRows.rows[0]

    let refund = null as null | { id: string; amount: number; status: string }
    if (input.status === "refunded") {
      const refundedAgg = await tx.query<{ already: any }>(
        `SELECT COALESCE(SUM(amount),0)::numeric as already FROM "RefundRecord" WHERE "orderId"=$1 AND status NOT IN ('rejected','failed')`,
        [req.orderId],
      )
      const alreadyRefunded = Number(refundedAgg.rows[0]?.already ?? 0)
      const orderTotal = Number(req.order_total ?? 0)

      const returnedItems = await tx.query<{
        receivedQty: number
        requestedQty: number
        quantity: number
        lineTotal: any
      }>(
        `
          SELECT
            rri."receivedQty",
            rri."requestedQty",
            oi.quantity,
            oi."lineTotal"
          FROM "ReturnRequestItem" rri
          INNER JOIN "OrderItem" oi ON oi.id = rri."orderItemId"
          WHERE rri."returnRequestId" = $1
        `,
        [input.returnRequestId],
      )
      const eligibleFromItems = returnedItems.rows.reduce((sum, item) => {
        if (Number(item.receivedQty ?? 0) <= 0 || Number(item.quantity ?? 0) <= 0) return sum
        const unit = Number(item.lineTotal ?? 0) / Number(item.quantity ?? 1)
        return sum + unit * Number(item.receivedQty ?? 0)
      }, 0)
      const eligibleBase = returnedItems.rows.length > 0 ? eligibleFromItems : orderTotal
      const maxRefundable = Math.max(Math.min(eligibleBase, orderTotal) - alreadyRefunded, 0)
      if (maxRefundable <= 0) throw new Error("Order already fully refunded")
      const amount = Number((input.refundAmount ?? maxRefundable).toFixed(2))
      if (amount > maxRefundable) {
        throw new Error(`Refund amount exceeds remaining refundable amount (${maxRefundable})`)
      }

      const reason = [input.reasonCode ? `[${input.reasonCode}]` : null, input.reason?.trim() || `Return refund: ${row.id}`]
        .filter(Boolean)
        .join(" ")

      const refundId = randomUUID()
      const refundRows = await tx.query(
        `
          INSERT INTO "RefundRecord" (id, "orderId", amount, reason, status, "createdAt", "updatedAt")
          VALUES ($1,$2,$3::numeric,$4,'processed',now(),now())
          RETURNING id, amount, status
        `,
        [refundId, req.orderId, amount, reason],
      )
      refund = refundRows.rows[0] as any
    }

    return { row, refund }
  })

  if (input.status === "refunded") {
    await updateOrderStatus(req.orderId, "returned", input.actorId, {
      reasonCode: "return_refunded",
      note: input.notes?.trim() || "Return request refunded",
    }).catch(() => null)
  }

  await logActivity({
    actorId: input.actorId,
    action: "return.settle",
    entityType: "ReturnRequest",
    entityId: input.returnRequestId,
    metadata: {
      status: input.status,
      fromStatus,
      reasonCode: input.reasonCode ?? null,
      refundAmount: input.refundAmount ?? null,
      orderId: req.orderId,
    },
  })
  await enqueueOutboxEvent({
    eventType: "return.settled",
    aggregateType: "return_request",
    aggregateId: input.returnRequestId,
    payload: {
      returnRequestId: input.returnRequestId,
      orderId: req.orderId,
      fromStatus,
      status: input.status,
      reasonCode: input.reasonCode ?? null,
      refund: updated.refund,
    },
  }).catch(() => null)

  return {
    returnRequest: updated.row,
    refund: updated.refund,
  }
}
