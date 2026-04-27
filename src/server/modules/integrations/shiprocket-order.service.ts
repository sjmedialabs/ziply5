import { prisma } from "@/src/server/db/prisma"
import { shiprocketClient } from "@/lib/integrations/shiprocket"

const parsePostalCode = (text?: string | null) => {
  if (!text) return null
  const match = text.match(/\b\d{6}\b/)
  return match?.[0] ?? null
}

const toWeight = (weight?: string | null) => {
  if (!weight) return 0.5
  const normalized = weight.trim().toLowerCase()
  const n = Number(normalized.replace(/[^\d.]/g, ""))
  if (!Number.isFinite(n) || n <= 0) return 0.5
  if (normalized.endsWith("kg")) return n
  if (normalized.endsWith("g")) return n / 1000
  return n
}

const addOrderNote = async (orderId: string, note: string, actorId?: string) => {
  await prisma.orderNote.create({
    data: {
      orderId,
      note,
      isInternal: true,
      createdById: actorId ?? null,
    },
  }).catch(() => null)
}

const persistExtendedShipmentFields = async (
  shipmentId: string,
  data: Partial<{
    shiprocketOrderId: string
    shiprocketShipmentId: string
    awbCode: string
    courierId: string
    pickupStatus: string
    trackingUrl: string
    shippingLabelUrl: string
    manifestUrl: string
    lastSyncAt: Date
  }>,
) => {
  const sets: string[] = []
  const values: Array<string | Date> = []
  const add = (column: string, value?: string | Date) => {
    if (value == null) return
    values.push(value)
    sets.push(`"${column}" = $${values.length}`)
  }
  add("shiprocketOrderId", data.shiprocketOrderId)
  add("shiprocketShipmentId", data.shiprocketShipmentId)
  add("awbCode", data.awbCode)
  add("courierId", data.courierId)
  add("pickupStatus", data.pickupStatus)
  add("trackingUrl", data.trackingUrl)
  add("shippingLabelUrl", data.shippingLabelUrl)
  add("manifestUrl", data.manifestUrl)
  add("lastSyncAt", data.lastSyncAt)
  if (sets.length === 0) return
  values.push(shipmentId)
  const shipmentIdPos = values.length
  await prisma.$executeRawUnsafe(
    `UPDATE "Shipment" SET ${sets.join(", ")} WHERE "id" = $${shipmentIdPos}`,
    ...values,
  ).catch(() => null)
}

export const checkOrderServiceability = async (orderId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: true,
        },
      },
      statusHistory: { orderBy: { changedAt: "desc" }, take: 1 },
    },
  })
  if (!order) throw new Error("Order not found")
  const latest = order.statusHistory[0]?.toStatus ?? order.status
  if (["cancelled", "delivered", "returned"].includes(latest)) {
    throw new Error("Order is not eligible for shipment")
  }
  const deliveryPostcode = parsePostalCode(order.customerAddress)
  const pickupPostcode = process.env.SHIPROCKET_PICKUP_POSTCODE?.trim() || "110001"
  if (!deliveryPostcode) throw new Error("Non-serviceable pincode: delivery postcode missing")
  const weight = order.items.reduce((sum, item) => sum + toWeight(item.product.weight) * item.quantity, 0)
  if (weight <= 0) throw new Error("Weight missing")

  const response = await shiprocketClient.checkServiceability({
    pickup_postcode: pickupPostcode,
    delivery_postcode: deliveryPostcode,
    cod: (order.paymentMethod ?? "").toLowerCase() === "cod" ? 1 : 0,
    weight,
    declared_value: Number(order.total),
  })
  if (!response.available_couriers?.length) {
    throw new Error("Non-serviceable pincode")
  }
  return { order, response, deliveryPostcode, pickupPostcode, weight }
}

export const createShiprocketShipmentForOrder = async (orderId: string, actorId: string) => {
  const { order, response, deliveryPostcode, pickupPostcode, weight } = await checkOrderServiceability(orderId)
  const bestCourier = [...response.available_couriers].sort((a, b) => a.rate - b.rate)[0]
  const createPayload = {
    order_id: order.id,
    order_date: new Date(order.createdAt).toISOString().slice(0, 19).replace("T", " "),
    pickup_location: "Primary Warehouse",
    billing_customer_name: order.customerName ?? "Customer",
    billing_last_name: "",
    billing_address: order.customerAddress ?? "Address unavailable",
    billing_city: "NA",
    billing_pincode: deliveryPostcode,
    billing_state: "NA",
    billing_country: "India",
    billing_email: "no-email@example.com",
    billing_phone: order.customerPhone ?? "9999999999",
    shipping_is_billing: true,
    order_items: order.items.map((item) => ({
      name: item.product.name,
      sku: item.product.sku ?? item.product.slug,
      units: item.quantity,
      selling_price: Number(item.unitPrice),
    })),
    payment_method: (order.paymentMethod ?? "").toLowerCase() === "cod" ? "COD" : "Prepaid",
    sub_total: Number(order.total),
    length: 10,
    breadth: 10,
    height: 10,
    weight,
  }

  const created = await shiprocketClient.createOrder(createPayload)
  if (!created.shipment_id) throw new Error("Shiprocket shipment_id missing")
  const exists = await prisma.shipment.findFirst({
    where: { orderId, shipmentNo: String(created.shipment_id) },
    select: { id: true },
  })
  if (exists) throw new Error("Duplicate shipment")

  const orderItems = order.items.map((item) => ({ orderItemId: item.id, quantity: item.quantity }))
  const shipment = await prisma.shipment.create({
    data: {
      orderId,
      shipmentNo: String(created.shipment_id),
      carrier: bestCourier?.name ?? "Shiprocket",
      shipmentStatus: "shipment_created",
      items: {
        create: orderItems,
      },
    },
    include: { items: true },
  })
  await prisma.order.update({
    where: { id: orderId },
    data: {
      statusHistory: {
        create: {
          fromStatus: order.statusHistory[0]?.toStatus ?? order.status,
          toStatus: "packed",
          reasonCode: "shipment_created",
          notes: `Shipment Created via Shiprocket, order_id=${created.order_id ?? "na"}, shipment_id=${created.shipment_id}`,
          changedById: actorId,
        },
      },
    },
  }).catch(() => null)
  await addOrderNote(orderId, `Shiprocket shipment created (shipment_id=${created.shipment_id}, pickup=${pickupPostcode})`, actorId)
  await persistExtendedShipmentFields(shipment.id, {
    shiprocketOrderId: created.order_id ? String(created.order_id) : undefined,
    shiprocketShipmentId: created.shipment_id ? String(created.shipment_id) : undefined,
    lastSyncAt: new Date(),
  })
  return { shipment, shiprocket: created, courier: bestCourier }
}

export const assignAwbForOrderShipment = async (orderId: string, actorId: string) => {
  const shipment = await prisma.shipment.findFirst({
    where: { orderId },
    orderBy: { createdAt: "desc" },
    select: { id: true, shipmentNo: true, trackingNo: true, carrier: true },
  })
  if (!shipment) throw new Error("Shipment not found")
  if (shipment.trackingNo) return { shipmentUpdated: false, reason: "AWB already assigned", shipment }
  const shipmentId = Number(shipment.shipmentNo ?? 0)
  if (!Number.isFinite(shipmentId) || shipmentId <= 0) throw new Error("Invalid shipment id for AWB assignment")
  const awb = await shiprocketClient.assignAwb({ shipment_id: shipmentId })
  if (!awb.awb_code) throw new Error("AWB assignment failed")
  const updated = await prisma.shipment.update({
    where: { id: shipment.id },
    data: {
      trackingNo: awb.awb_code,
      carrier: awb.courier_name ?? shipment.carrier,
      shipmentStatus: "ready_to_ship",
    },
  })
  await persistExtendedShipmentFields(updated.id, {
    awbCode: awb.awb_code,
    courierId: awb.courier_company_id ? String(awb.courier_company_id) : undefined,
    trackingUrl: awb.tracking_url,
    lastSyncAt: new Date(),
  })
  await addOrderNote(orderId, `AWB assigned (${awb.awb_code})`, actorId)
  return { shipmentUpdated: true, shipment: updated, awb }
}

export const generatePickupForOrderShipment = async (orderId: string, actorId: string) => {
  const shipment = await prisma.shipment.findFirst({
    where: { orderId },
    orderBy: { createdAt: "desc" },
    select: { id: true, shipmentNo: true, shipmentStatus: true },
  })
  if (!shipment) throw new Error("Shipment not found")
  const shipmentId = Number(shipment.shipmentNo ?? 0)
  if (!Number.isFinite(shipmentId) || shipmentId <= 0) throw new Error("Invalid shipment id for pickup")
  const pickup = await shiprocketClient.generatePickup({ shipment_id: shipmentId })
  const updated = await prisma.shipment.update({
    where: { id: shipment.id },
    data: {
      shipmentStatus: pickup.pickup_status ?? "pickup_requested",
    },
  })
  await persistExtendedShipmentFields(updated.id, {
    pickupStatus: pickup.pickup_status ?? "scheduled",
    lastSyncAt: new Date(),
  })
  await addOrderNote(orderId, `Pickup generated (${pickup.pickup_status ?? "scheduled"})`, actorId)
  return { shipment: updated, pickup }
}

const getOrderSyncEligibility = async (orderId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { product: true } },
      statusHistory: { orderBy: { changedAt: "desc" }, take: 1 },
      shipments: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  })
  if (!order) return { eligible: false as const, reason: "Order not found" }
  const latest = (order.statusHistory[0]?.toStatus ?? order.status ?? "").toLowerCase()
  const payment = (order.paymentStatus ?? "").toUpperCase()
  const paymentMethod = (order.paymentMethod ?? "").toLowerCase()

  if (["cancelled", "delivered", "returned"].includes(latest)) return { eligible: false as const, reason: "Order already closed" }
  if (order.shipments.length > 0) return { eligible: false as const, reason: "Already synced" }
  if (!order.items.length) return { eligible: false as const, reason: "No order items" }
  if (!order.customerAddress?.trim()) return { eligible: false as const, reason: "Address incomplete" }
  if (!order.customerPhone?.trim()) return { eligible: false as const, reason: "Missing phone number" }
  const accepted = ["confirmed", "packed", "shipped"].includes(latest)
  if (!accepted) return { eligible: false as const, reason: "Order not accepted by admin" }
  const paidOrCodApproved = payment === "SUCCESS" || paymentMethod === "cod"
  if (!paidOrCodApproved) return { eligible: false as const, reason: "Payment not eligible for sync" }
  return { eligible: true as const, order }
}

export const syncOrderToShiprocket = async (orderId: string, actorId: string, options?: { generatePickup?: boolean }) => {
  const eligibility = await getOrderSyncEligibility(orderId)
  if (!eligibility.eligible) return { status: "skipped" as const, orderId, reason: eligibility.reason }
  try {
    const created = await createShiprocketShipmentForOrder(orderId, actorId)
    const awb = await assignAwbForOrderShipment(orderId, actorId)
    const pickup = options?.generatePickup === false ? null : await generatePickupForOrderShipment(orderId, actorId)
    return {
      status: "synced" as const,
      orderId,
      created,
      awb,
      pickup,
      syncTime: new Date().toISOString(),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed"
    await addOrderNote(orderId, `Shiprocket sync failed: ${message}`, actorId)
    return { status: "failed" as const, orderId, reason: message, syncTime: new Date().toISOString() }
  }
}

export const syncBulkOrders = async (
  orderIds: string[],
  actorId: string,
  options?: { generatePickup?: boolean; retryFailedOnly?: boolean },
) => {
  const unique = [...new Set(orderIds)]
  const results = [] as Array<Awaited<ReturnType<typeof syncOrderToShiprocket>>>
  for (const orderId of unique) {
    const result = await syncOrderToShiprocket(orderId, actorId, options)
    if (options?.retryFailedOnly && result.status !== "failed") continue
    results.push(result)
  }
  const synced = results.filter((r) => r.status === "synced").length
  const failed = results.filter((r) => r.status === "failed").length
  const skipped = results.filter((r) => r.status === "skipped").length
  return {
    total: results.length,
    synced,
    failed,
    skipped,
    results,
  }
}
