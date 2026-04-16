import { prisma } from "@/src/server/db/prisma"
import { logActivity } from "@/src/server/modules/activity/activity.service"
import { enqueueOutboxEvent } from "@/src/server/modules/integrations/outbox.service"
import { updateOrderStatus } from "@/src/server/modules/orders/orders.service"

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
  const req = await prisma.returnRequest.findUnique({
    where: { id: input.returnRequestId },
    include: { order: { include: { items: true } } },
  })
  if (!req) throw new Error("Return request not found")

  const current = (req.status || "requested") as ReturnLifecycleStatus
  if (!["requested", "approved"].includes(current)) {
    throw new Error(`Cannot schedule pickup when return is ${current}`)
  }
  const orderItemById = new Map(req.order.items.map((i) => [i.id, i]))
  for (const item of input.items) {
    const orderItem = orderItemById.get(item.orderItemId)
    if (!orderItem) throw new Error(`Invalid order item: ${item.orderItemId}`)
    if (item.requestedQty > orderItem.quantity) {
      throw new Error(`Requested quantity exceeds order quantity for ${item.orderItemId}`)
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const pickup = await tx.returnPickup.upsert({
      where: { returnRequestId: input.returnRequestId },
      create: {
        returnRequestId: input.returnRequestId,
        pickupDate: input.pickupDate,
        timeSlot: input.timeSlot?.trim() || null,
        carrier: input.carrier?.trim() || null,
        trackingRef: input.trackingRef?.trim() || null,
        status: "scheduled",
        notes: input.notes?.trim() || null,
      },
      update: {
        pickupDate: input.pickupDate,
        timeSlot: input.timeSlot?.trim() || null,
        carrier: input.carrier?.trim() || null,
        trackingRef: input.trackingRef?.trim() || null,
        status: "scheduled",
        notes: input.notes?.trim() || null,
      },
    })

    for (const item of input.items) {
      await tx.returnRequestItem.upsert({
        where: {
          returnRequestId_orderItemId: {
            returnRequestId: input.returnRequestId,
            orderItemId: item.orderItemId,
          },
        },
        create: {
          returnRequestId: input.returnRequestId,
          orderItemId: item.orderItemId,
          requestedQty: item.requestedQty,
          receivedQty: 0,
          reasonCode: item.reasonCode ?? null,
          notes: item.notes?.trim() || null,
        },
        update: {
          requestedQty: item.requestedQty,
          reasonCode: item.reasonCode ?? null,
          notes: item.notes?.trim() || null,
        },
      })
    }

    const nextStatus: ReturnLifecycleStatus = current === "requested" ? "approved" : current
    if (nextStatus !== current) {
      await tx.returnRequest.update({
        where: { id: input.returnRequestId },
        data: { status: nextStatus },
      })
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
  const req = await prisma.returnRequest.findUnique({
    where: { id: input.returnRequestId },
    include: {
      order: { include: { items: true } },
      items: true,
      pickup: true,
    },
  })
  if (!req) throw new Error("Return request not found")
  const current = (req.status || "requested") as ReturnLifecycleStatus
  const target = input.status as ReturnLifecycleStatus
  if (!returnTransitions[current]?.includes(target)) {
    throw new Error(`Invalid return transition: ${current} -> ${target}`)
  }

  const byOrderItemId = new Map(req.order.items.map((i) => [i.id, i]))
  const byReturnItemId = new Map(req.items.map((i) => [i.orderItemId, i]))

  await prisma.$transaction(async (tx) => {
    for (const item of input.items) {
      const orderItem = byOrderItemId.get(item.orderItemId)
      if (!orderItem) throw new Error(`Invalid order item: ${item.orderItemId}`)
      const existing = byReturnItemId.get(item.orderItemId)
      const requestedQty = existing?.requestedQty ?? orderItem.quantity
      if (item.receivedQty > requestedQty) {
        throw new Error(`receivedQty exceeds requestedQty for ${item.orderItemId}`)
      }
      await tx.returnRequestItem.upsert({
        where: {
          returnRequestId_orderItemId: {
            returnRequestId: input.returnRequestId,
            orderItemId: item.orderItemId,
          },
        },
        create: {
          returnRequestId: input.returnRequestId,
          orderItemId: item.orderItemId,
          requestedQty,
          receivedQty: item.receivedQty,
          conditionStatus: item.conditionStatus ?? null,
          notes: item.notes?.trim() || null,
        },
        update: {
          receivedQty: item.receivedQty,
          conditionStatus: item.conditionStatus ?? null,
          notes: item.notes?.trim() || null,
        },
      })
    }

    await tx.returnRequest.update({
      where: { id: input.returnRequestId },
      data: { status: input.status },
    })
    if (req.pickup) {
      await tx.returnPickup.update({
        where: { returnRequestId: input.returnRequestId },
        data: {
          status: input.status === "picked_up" ? "picked_up" : "received",
          notes: input.notes?.trim() || req.pickup.notes || null,
        },
      })
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

  return prisma.returnRequest.findUnique({
    where: { id: input.returnRequestId },
    include: { items: true, pickup: true },
  })
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
  const req = await prisma.returnRequest.findUnique({
    where: { id: input.returnRequestId },
    include: { order: { select: { id: true, total: true } } },
  })
  if (!req) throw new Error("Return request not found")

  const fromStatus = (req.status || "requested") as ReturnLifecycleStatus
  const toStatus = input.status as ReturnLifecycleStatus
  if (fromStatus === "refunded") throw new Error("Return request already refunded")
  if (fromStatus === toStatus) throw new Error(`Return request already in status ${toStatus}`)
  if (!returnTransitions[fromStatus]?.includes(toStatus)) {
    throw new Error(`Invalid return transition: ${fromStatus} -> ${toStatus}`)
  }

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.returnRequest.update({
      where: { id: input.returnRequestId },
      data: { status: input.status },
      include: { order: { select: { id: true, total: true, status: true } } },
    })

    let refund = null as null | { id: string; amount: number; status: string }
    if (input.status === "refunded") {
      const refundedAgg = await tx.refundRecord.aggregate({
        where: {
          orderId: row.order.id,
          status: { notIn: ["rejected", "failed"] },
        },
        _sum: { amount: true },
      })
      const alreadyRefunded = Number(refundedAgg._sum.amount ?? 0)
      const orderTotal = Number(row.order.total)
      const returnedItems = await tx.returnRequestItem.findMany({
        where: { returnRequestId: input.returnRequestId },
        include: { orderItem: true },
      })
      const eligibleFromItems = returnedItems.reduce((sum, item) => {
        if (item.receivedQty <= 0 || item.orderItem.quantity <= 0) return sum
        const unit = Number(item.orderItem.lineTotal) / item.orderItem.quantity
        return sum + unit * item.receivedQty
      }, 0)
      const eligibleBase = returnedItems.length > 0 ? eligibleFromItems : orderTotal
      const maxRefundable = Math.max(Math.min(eligibleBase, orderTotal) - alreadyRefunded, 0)
      if (maxRefundable <= 0) {
        throw new Error("Order already fully refunded")
      }
      const amount = Number((input.refundAmount ?? maxRefundable).toFixed(2))
      if (amount > maxRefundable) {
        throw new Error(`Refund amount exceeds remaining refundable amount (${maxRefundable})`)
      }
      const created = await tx.refundRecord.create({
        data: {
          orderId: row.order.id,
          amount,
          reason:
            [
              input.reasonCode ? `[${input.reasonCode}]` : null,
              input.reason?.trim() || `Return refund: ${row.id}`,
            ]
              .filter(Boolean)
              .join(" "),
          status: "processed",
        },
      })
      refund = { id: created.id, amount: Number(created.amount), status: created.status }
    }

    return { row, refund }
  })

  if (input.status === "refunded") {
    await updateOrderStatus(req.order.id, "returned", input.actorId, {
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
      orderId: req.order.id,
    },
  })
  await enqueueOutboxEvent({
    eventType: "return.settled",
    aggregateType: "return_request",
    aggregateId: input.returnRequestId,
    payload: {
      returnRequestId: input.returnRequestId,
      orderId: req.order.id,
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
