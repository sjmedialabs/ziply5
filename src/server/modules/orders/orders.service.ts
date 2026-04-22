import type { Prisma } from "@prisma/client"
import { prisma } from "@/src/server/db/prisma"
import { computeCouponDiscount } from "@/src/server/modules/coupons/coupons.service"
import { logActivity } from "@/src/server/modules/activity/activity.service"
import { emailTemplates, enqueueEmail } from "@/src/server/modules/notifications/email.service"
import { enqueueOutboxEvent } from "@/src/server/modules/integrations/outbox.service"
import { assertMasterValueExists } from "@/src/server/modules/master/master.service"

export type OrderLifecycleStatus =
  | "pending"
  | "pending_payment"
  | "payment_success"
  | "admin_approval_pending"
  | "failed"
  | "confirmed"
  | "packed"
  | "shipped"
  | "delivered"
  | "cancel_requested"
  | "returned"
  | "return_requested"
  | "return_approved"
  | "refund_initiated"
  | "cancelled"

const allowedTransitions: Record<OrderLifecycleStatus, OrderLifecycleStatus[]> = {
  pending_payment: ["payment_success", "failed"],
  payment_success: ["admin_approval_pending"],
  admin_approval_pending: ["confirmed", "cancelled"],
  failed: ["payment_success"],
  pending: ["confirmed", "cancelled"],
  confirmed: ["packed", "cancel_requested", "cancelled"],
  packed: ["shipped", "cancel_requested", "cancelled"],
  shipped: ["delivered", "returned"],
  delivered: ["returned", "return_requested"],
  cancel_requested: ["cancelled", "confirmed"],
  returned: [],
  return_requested: ["return_approved", "returned", "delivered"],
  return_approved: ["refund_initiated", "returned"],
  refund_initiated: ["returned"],
  cancelled: [],
}

const persistedOrderStatus = (status: OrderLifecycleStatus): "pending" | "confirmed" | "shipped" | "delivered" | "cancelled" => {
  if (status === "pending_payment" || status === "payment_success" || status === "admin_approval_pending" || status === "failed") return "pending"
  if (status === "cancel_requested") return "confirmed"
  if (status === "packed") return "confirmed"
  if (status === "returned" || status === "return_requested" || status === "return_approved" || status === "refund_initiated") return "delivered"
  return status
}

export const isAutoApproveOrdersEnabled = async () => {
  const row = await prisma.setting.findUnique({
    where: { group_key: { group: "orders", key: "auto_approve_orders" } },
    select: { valueJson: true },
  })
  if (!row) return false
  const value = row.valueJson
  if (typeof value === "boolean") return value
  if (typeof value === "string") return value.toLowerCase() === "true"
  if (typeof value === "object" && value && "enabled" in value) {
    return Boolean((value as { enabled?: unknown }).enabled)
  }
  return false
}

const normalizePaymentStatus = (status?: string | null) => {
  const value = (status ?? "").toUpperCase()
  if (value === "PAID") return "SUCCESS"
  if (value === "PENDING") return "PENDING"
  if (value === "FAILED") return "FAILED"
  if (value === "REFUNDED") return "REFUNDED"
  if (value === "SUCCESS") return "SUCCESS"
  return "PENDING"
}

const reserveInventoryForOrder = async (
  tx: Prisma.TransactionClient,
  lines: Array<{ productId: string; variantId?: string | null; quantity: number }>,
) => {
  for (const line of lines) {
    const warehouseStock = await tx.inventoryItem.findFirst({
      where: { productId: line.productId, available: { gte: line.quantity } },
      orderBy: { updatedAt: "asc" },
    })
    if (warehouseStock) {
      await tx.inventoryItem.update({
        where: { id: warehouseStock.id },
        data: {
          available: { decrement: line.quantity },
          reserved: { increment: line.quantity },
        },
      })
      continue
    }

    if (line.variantId) {
      const variantStock = await tx.productVariant.findFirst({
        where: { id: line.variantId, productId: line.productId, stock: { gte: line.quantity } },
      })
      if (!variantStock) {
        throw new Error("Insufficient variant inventory to reserve order")
      }
      await tx.productVariant.update({
        where: { id: variantStock.id },
        data: { stock: { decrement: line.quantity } },
      })
      continue
    }

    const product = await tx.product.findUnique({
      where: { id: line.productId },
      select: { totalStock: true },
    })
    if (!product || product.totalStock < line.quantity) {
      throw new Error("Insufficient inventory to reserve order")
    }
    await tx.product.update({
      where: { id: line.productId },
      data: {
        totalStock: { decrement: line.quantity },
        stockStatus: product.totalStock - line.quantity > 0 ? "in_stock" : "out_of_stock",
      },
    })
  }
}

export const createOrderFromCheckout = async (input: {
  items: { productId?: string; variantId?: string | null; slug?: string; quantity: number }[]
  userId?: string | null
  shipping?: number
  currency?: string
  couponCode?: string
  gateway: string

  // 🔥 ADD THIS
  billingAddress?: {
    fullName: string
    line1: string
    city: string
    state: string
    postalCode: string
    country: string
    phone?: string
  }

  paymentStatus?: string
  paymentId?: string
}) => {
  if (input.paymentId?.trim()) {
    const existing = await prisma.order.findFirst({
      where: {
        paymentId: input.paymentId.trim(),
        ...(input.userId ? { userId: input.userId } : {}),
      },
      include: {
        items: { include: { product: { select: { id: true, name: true, slug: true } } } },
        transactions: true,
      },
    })
    if (existing) return existing
  }

  const shipping = input.shipping ?? 0
  const slugs = [...new Set(input.items.map((i) => i.slug).filter(Boolean))] as string[]
  const productIds = [...new Set(input.items.map((i) => i.productId).filter(Boolean))] as string[]
  const products = await prisma.product.findMany({
    where: {
      OR: [
        slugs.length ? { slug: { in: slugs } } : undefined,
        productIds.length ? { id: { in: productIds } } : undefined,
      ].filter(Boolean) as Prisma.ProductWhereInput[],
      status: "published",
    },
    include: {
      variants: {
        select: { id: true, price: true, stock: true, isDefault: true, weight: true, name: true, sku: true },
      },
    },
  })
  const bySlug = Object.fromEntries(products.map((p) => [p.slug, p]))
  const byId = Object.fromEntries(products.map((p) => [p.id, p]))

  let subtotal = 0
  const lines: { productId: string; variantId?: string | null; quantity: number; unitPrice: number; lineTotal: number }[] = []

  for (const line of input.items) {
    const p = line.productId ? byId[line.productId] : bySlug[line.slug ?? ""]
    if (!p) throw new Error(`Product not available: ${line.slug ?? line.productId ?? "unknown"}`)

    const variantId = line.variantId ?? null
    let unit = Number(p.price)
    if (p.type === "variant") {
      const fallback = p.variants.find((v) => v.isDefault) ?? p.variants[0]
      const chosen = variantId ? p.variants.find((v) => v.id === variantId) : fallback
      if (!chosen) {
        throw new Error(`Variant is required for product: ${p.slug}`)
      }
      if (chosen.stock < line.quantity) {
        throw new Error(`Variant out of stock for product: ${p.slug}`)
      }
      unit = Number(chosen.price)
    }
    const lineTotal = unit * line.quantity
    lines.push({
      productId: p.id,
      variantId,
      quantity: line.quantity,
      unitPrice: unit,
      lineTotal,
    })
    subtotal += lineTotal
  }

  let discount = 0
  if (input.couponCode?.trim()) {
    const applied = await computeCouponDiscount(input.couponCode, subtotal)
    discount = applied.discount
  }

  const total = Math.max(subtotal + shipping - discount, 0)

  const order = await prisma.$transaction(async (tx) => {
    await reserveInventoryForOrder(
      tx,
      lines.map((line) => ({ productId: line.productId, variantId: line.variantId, quantity: line.quantity })),
    )

    const created = await tx.order.create({
      data: {
      userId: input.userId ?? undefined,

      // 🔥 CUSTOMER SNAPSHOT (VERY IMPORTANT)
      customerName: input.billingAddress?.fullName ?? null,
      customerPhone: input.billingAddress?.phone ?? null,
      customerAddress: input.billingAddress
        ? `${input.billingAddress.line1}, ${input.billingAddress.city}, ${input.billingAddress.state}, ${input.billingAddress.postalCode}, ${input.billingAddress.country}`
        : null,

      // 🔥 PAYMENT DATA
      paymentStatus: normalizePaymentStatus(input.paymentStatus),
      paymentId: input.paymentId ?? null,
      paymentMethod: input.gateway,

      createdById: null,
      managedById: null,
      status: "pending",
      currency: input.currency ?? "INR",
      subtotal,
      shipping,
      total,
      items: {
        create: lines.map((l) => ({
          productId: l.productId,
          variantId: l.variantId ?? null,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          lineTotal: l.lineTotal,
        })),
      },
      statusHistory: {
        create: {
          toStatus: "pending_payment",
          notes: "Order created, awaiting payment",
          changedById: input.userId ?? undefined,
        },
      },
    },
      include: {
      items: { include: { product: { select: { id: true, name: true, slug: true } } } },
    },
    })

  await tx.transaction.create({
    data: {
      orderId: created.id,
      gateway: input.gateway,
      amount: total,
      status: input.paymentStatus === "paid" ? "paid" : input.paymentStatus === "failed" ? "failed" : "pending",
      externalId: input.paymentId ?? null,
    },
  })

  return created
})

  await logActivity({
    actorId: input.userId ?? undefined,
    action: "order.create",
    entityType: "Order",
    entityId: order.id,
    metadata: { itemCount: lines.length, total },
  })

if (input.userId) {
  const user = await prisma.user.findUnique({ where: { id: input.userId }, select: { email: true } })
  if (user?.email) {
    try {
      const mail = emailTemplates.orderPlaced(order.id)
      await enqueueEmail({ to: user.email, ...mail })
    } catch {
      // Non-blocking side effect
    }
  }
}

await enqueueOutboxEvent({
  eventType: "order.created",
  aggregateType: "order",
  aggregateId: order.id,
  payload: { orderId: order.id, total, currency: input.currency ?? "INR" },
}).catch(() => null)

return order
}

export const listOrders = async (
  page: number,
  limit: number,
  role: string,
  userId: string,
) => {
  const skip = (page - 1) * limit
  const where: Prisma.OrderWhereInput = {}
  if (role === "customer") {
    where.userId = userId
  }

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        items: { include: { product: { select: { id: true, name: true, slug: true } } } },
        transactions: true,
        user: { select: { id: true, name: true, email: true } },
        returnRequests: { select: { id: true, status: true } },
        refunds: { select: { id: true, status: true, amount: true } },
        statusHistory: { orderBy: { changedAt: "desc" }, take: 6, select: { toStatus: true, changedAt: true } },
      },
    }),
    prisma.order.count({ where }),
  ])

  return { items, total, page, limit }
}

export const getOrderById = async (id: string) => {
  return prisma.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: true } },
      transactions: true,
      statusHistory: { orderBy: { changedAt: "desc" } },
      notes: { orderBy: { createdAt: "desc" } },
      fulfillment: true,
      shipments: { orderBy: { createdAt: "desc" } },
      returnRequests: { orderBy: { createdAt: "desc" }, include: { pickup: true, items: true } },
      refunds: { orderBy: { createdAt: "desc" } },
      invoice: true,
    },
  })
}

export const getOrderForActor = async (id: string, role: string, userId: string) => {
  const order = await getOrderById(id)
  if (!order) return null
  if (role === "admin" || role === "super_admin") return order
  if (role === "customer" && order.userId === userId) return order
  return null
}

export const updateOrderStatus = async (
  id: string,
  status: OrderLifecycleStatus,
  actorId?: string,
  options?: { reasonCode?: string; note?: string },
) => {
  const allowed = await assertMasterValueExists("ORDER_STATUS", status)
  if (!allowed) throw new Error(`Invalid master value for ORDER_STATUS: ${status}`)
  const existing = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      paymentStatus: true,
      statusHistory: { orderBy: { changedAt: "desc" }, take: 1, select: { toStatus: true } },
    },
  })
  if (!existing) throw new Error("Order not found")
  const fromStatus = (existing.statusHistory[0]?.toStatus as OrderLifecycleStatus | undefined) ??
    (existing.status as OrderLifecycleStatus)
  const paymentStatus = normalizePaymentStatus(existing.paymentStatus)
  if (status === "confirmed" && paymentStatus !== "SUCCESS") {
    throw new Error("Order cannot move to CONFIRMED unless payment_status = SUCCESS")
  }
  if (["pending", "pending_payment", "failed"].includes(fromStatus) && status === "confirmed" && paymentStatus !== "SUCCESS") {
    throw new Error("Invalid status transition: pending/failed -> confirmed requires payment success")
  }
  if (fromStatus === "shipped" && status === "cancel_requested") {
    throw new Error("Cannot request cancellation after shipment")
  }
  if (status !== fromStatus && !allowedTransitions[fromStatus]?.includes(status)) {
    throw new Error(`Invalid status transition: ${fromStatus} -> ${status}`)
  }

  const order = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id },
      data: {
        status: persistedOrderStatus(status),
        statusHistory: {
          create: {
            fromStatus,
            toStatus: status,
            reasonCode: options?.reasonCode ?? null,
            notes: options?.note ?? null,
            changedById: actorId ?? undefined,
          },
        },
      },
      include: {
        items: { include: { product: true } },
        transactions: true,
        statusHistory: { orderBy: { changedAt: "desc" } },
        notes: { orderBy: { createdAt: "desc" } },
      },
    })

    const fulfillmentStatusMap: Partial<Record<OrderLifecycleStatus, string>> = {
      pending: "pending",
      confirmed: "confirmed",
      packed: "packed",
      shipped: "shipped",
      delivered: "delivered",
      returned: "returned",
      cancelled: "cancelled",
    }
    await tx.orderFulfillment.upsert({
      where: { orderId: id },
      create: {
        orderId: id,
        fulfillmentStatus: fulfillmentStatusMap[status] ?? status,
        packedAt: status === "packed" ? new Date() : null,
        shippedAt: status === "shipped" ? new Date() : null,
        deliveredAt: status === "delivered" ? new Date() : null,
      },
      update: {
        fulfillmentStatus: fulfillmentStatusMap[status] ?? status,
        packedAt: status === "packed" ? new Date() : undefined,
        shippedAt: status === "shipped" ? new Date() : undefined,
        deliveredAt: status === "delivered" ? new Date() : undefined,
      },
    })
    return updated
  })

  await logActivity({
    actorId: actorId ?? undefined,
    action: "order.status",
    entityType: "Order",
    entityId: id,
    metadata: { status },
  })

  if (order.userId) {
    const user = await prisma.user.findUnique({ where: { id: order.userId }, select: { email: true } })
    if (user?.email) {
      try {
        const mail = emailTemplates.orderStatus(id, status)
        await enqueueEmail({ to: user.email, ...mail })
      } catch {
        // Non-blocking side effect
      }
    }
  }

  await enqueueOutboxEvent({
    eventType: "order.status.updated",
    aggregateType: "order",
    aggregateId: id,
    payload: { orderId: id, fromStatus, toStatus: status, reasonCode: options?.reasonCode ?? null },
  }).catch(() => null)

  return order
}

export const addOrderNote = async (input: {
  orderId: string
  note: string
  actorId: string
  isInternal?: boolean
}) => {
  const order = await prisma.order.findUnique({ where: { id: input.orderId }, select: { id: true } })
  if (!order) throw new Error("Order not found")
  const created = await prisma.orderNote.create({
    data: {
      orderId: input.orderId,
      note: input.note.trim(),
      isInternal: input.isInternal ?? true,
      createdById: input.actorId,
    },
  })
  await logActivity({
    actorId: input.actorId,
    action: "order.note.create",
    entityType: "Order",
    entityId: input.orderId,
    metadata: { noteId: created.id, isInternal: created.isInternal },
  })
  return created
}

export const listOrderShipments = async (orderId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true },
  })
  if (!order) throw new Error("Order not found")
  return prisma.shipment.findMany({
    where: { orderId },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  })
}

export const createOrderShipment = async (input: {
  orderId: string
  actorId: string
  carrier: string
  shipmentNo?: string
  trackingNo?: string
  itemAllocations: Array<{ orderItemId: string; quantity: number }>
}) => {
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: { items: true, statusHistory: { orderBy: { changedAt: "desc" }, take: 1 } },
  })
  if (!order) throw new Error("Order not found")
  const itemById = new Map(order.items.map((item) => [item.id, item]))
  for (const allocation of input.itemAllocations) {
    const item = itemById.get(allocation.orderItemId)
    if (!item) throw new Error(`Invalid order item: ${allocation.orderItemId}`)
    if (allocation.quantity > item.quantity) {
      throw new Error(`Allocated quantity exceeds ordered quantity for ${allocation.orderItemId}`)
    }
  }

  const shipment = await prisma.$transaction(async (tx) => {
    const created = await tx.shipment.create({
      data: {
        orderId: input.orderId,
        shipmentNo: input.shipmentNo?.trim() || null,
        carrier: input.carrier.trim(),
        trackingNo: input.trackingNo?.trim() || null,
        shipmentStatus: "shipped",
        shippedAt: new Date(),
        items: {
          create: input.itemAllocations.map((item) => ({
            orderItemId: item.orderItemId,
            quantity: item.quantity,
          })),
        },
      },
      include: { items: true },
    })

    const fromStatus = (order.statusHistory?.[0]?.toStatus as OrderLifecycleStatus | undefined) ??
      (order.status as OrderLifecycleStatus)
    await tx.order.update({
      where: { id: input.orderId },
      data: {
        status: persistedOrderStatus("shipped"),
        statusHistory: {
          create: {
            fromStatus,
            toStatus: "shipped",
            notes: `Shipment created via ${input.carrier.trim()}`,
            changedById: input.actorId,
          },
        },
      },
    })
    await tx.orderFulfillment.upsert({
      where: { orderId: input.orderId },
      create: {
        orderId: input.orderId,
        fulfillmentStatus: "shipped",
        shippedAt: new Date(),
      },
      update: {
        fulfillmentStatus: "shipped",
        shippedAt: new Date(),
      },
    })
    return created
  })

  await logActivity({
    actorId: input.actorId,
    action: "order.shipment.create",
    entityType: "Order",
    entityId: input.orderId,
    metadata: { shipmentId: shipment.id, carrier: shipment.carrier },
  })
  await enqueueOutboxEvent({
    eventType: "order.shipped",
    aggregateType: "order",
    aggregateId: input.orderId,
    payload: { orderId: input.orderId, shipmentId: shipment.id, carrier: shipment.carrier, trackingNo: shipment.trackingNo },
  }).catch(() => null)

  return shipment
}

export const getCodSettlement = async (orderId: string) => {
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true } })
  if (!order) throw new Error("Order not found")
  return prisma.codSettlement.findUnique({ where: { orderId } })
}

export const reconcileCodSettlement = async (input: {
  orderId: string
  actorId: string
  collectedAmount: number
  settledAmount?: number
  status?: "pending" | "partial" | "settled" | "failed"
  notes?: string
}) => {
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    select: { id: true, total: true },
  })
  if (!order) throw new Error("Order not found")

  const expectedAmount = Number(order.total)
  const settledAmount = input.settledAmount ?? input.collectedAmount
  const varianceAmount = Number((input.collectedAmount - expectedAmount).toFixed(2))
  const status =
    input.status ??
    (settledAmount >= expectedAmount ? "settled" : settledAmount > 0 ? "partial" : "pending")

  const settlement = await prisma.codSettlement.upsert({
    where: { orderId: input.orderId },
    create: {
      orderId: input.orderId,
      expectedAmount,
      collectedAmount: input.collectedAmount,
      settledAmount,
      varianceAmount,
      status,
      notes: input.notes?.trim() || null,
      reconciledById: input.actorId,
      reconciledAt: new Date(),
    },
    update: {
      expectedAmount,
      collectedAmount: input.collectedAmount,
      settledAmount,
      varianceAmount,
      status,
      notes: input.notes?.trim() || null,
      reconciledById: input.actorId,
      reconciledAt: new Date(),
    },
  })

  await logActivity({
    actorId: input.actorId,
    action: "order.cod.reconcile",
    entityType: "Order",
    entityId: input.orderId,
    metadata: { status, collectedAmount: input.collectedAmount, settledAmount, varianceAmount },
  })
  await enqueueOutboxEvent({
    eventType: "order.cod.reconciled",
    aggregateType: "order",
    aggregateId: input.orderId,
    payload: {
      orderId: input.orderId,
      settlementId: settlement.id,
      status,
      collectedAmount: settlement.collectedAmount,
      settledAmount: settlement.settledAmount,
    },
  }).catch(() => null)

  return settlement
}

export const confirmOrderDelivery = async (input: {
  orderId: string
  actorId: string
  shipmentId?: string
  note?: string
}) => {
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: { shipments: { orderBy: { createdAt: "desc" } }, statusHistory: { orderBy: { changedAt: "desc" }, take: 1 } },
  })
  if (!order) throw new Error("Order not found")

  const fromStatus = (order.statusHistory[0]?.toStatus as OrderLifecycleStatus | undefined) ??
    (order.status as OrderLifecycleStatus)
  if (!["shipped", "delivered"].includes(fromStatus)) {
    throw new Error(`Invalid status transition: ${fromStatus} -> delivered`)
  }

  const shipmentToUpdate =
    input.shipmentId ?? order.shipments.find((s) => s.shipmentStatus !== "delivered")?.id ?? order.shipments[0]?.id

  await prisma.$transaction(async (tx) => {
    if (shipmentToUpdate) {
      await tx.shipment.update({
        where: { id: shipmentToUpdate },
        data: { shipmentStatus: "delivered", deliveredAt: new Date() },
      })
    }
    await tx.order.update({
      where: { id: input.orderId },
      data: {
        status: persistedOrderStatus("delivered"),
        statusHistory: {
          create: {
            fromStatus,
            toStatus: "delivered",
            notes: input.note?.trim() || "Delivered confirmation",
            changedById: input.actorId,
          },
        },
      },
    })
    await tx.orderFulfillment.upsert({
      where: { orderId: input.orderId },
      create: {
        orderId: input.orderId,
        fulfillmentStatus: "delivered",
        deliveredAt: new Date(),
      },
      update: {
        fulfillmentStatus: "delivered",
        deliveredAt: new Date(),
      },
    })
  })

  await logActivity({
    actorId: input.actorId,
    action: "order.delivery.confirm",
    entityType: "Order",
    entityId: input.orderId,
    metadata: { shipmentId: shipmentToUpdate ?? null },
  })
  await enqueueOutboxEvent({
    eventType: "order.delivered",
    aggregateType: "order",
    aggregateId: input.orderId,
    payload: { orderId: input.orderId, shipmentId: shipmentToUpdate ?? null },
  }).catch(() => null)

  return getOrderById(input.orderId)
}

