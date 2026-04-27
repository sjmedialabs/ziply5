import crypto from "node:crypto"
import { prisma } from "@/src/server/db/prisma"
import { env } from "@/src/server/core/config/env"

type ShiprocketAuthResponse = {
  token?: string
}

type ShiprocketTrackResponse = {
  tracking_data?: {
    shipment_track?: Array<{
      current_status?: string
      shipment_status?: string
      awb_code?: string
      activity_date?: string
    }>
    shipment_status?: string
    current_status?: string
  }
}

let tokenCache: { token: string; expiresAt: number } | null = null

const hasShiprocketConfig = () => Boolean(env.SHIPROCKET_EMAIL && env.SHIPROCKET_PASSWORD)
const shiprocketBaseUrl = (env.SHIPROCKET_BASE_URL ?? "https://apiv2.shiprocket.in/v1/external").replace(/\/+$/, "")

const normalizeShiprocketState = (value: string) => value.trim().toLowerCase()

const mapShiprocketToOrderStatus = (status: string): "shipped" | "delivered" | "cancelled" | null => {
  const normalized = normalizeShiprocketState(status)
  if (!normalized) return null
  if (/(delivered|delivery completed)/i.test(normalized)) return "delivered"
  if (/(cancelled|canceled|undelivered|rto delivered|rto complete)/i.test(normalized)) return "cancelled"
  if (/(shipped|in transit|out for delivery|picked up|manifested)/i.test(normalized)) return "shipped"
  return null
}

const mapShiprocketEventToShipmentStatus = (event: string) => {
  const normalized = normalizeShiprocketState(event)
  if (!normalized) return null
  if (/shipment_created/.test(normalized)) return "shipment_created"
  if (/awb_assigned/.test(normalized)) return "ready_to_ship"
  if (/picked_up/.test(normalized)) return "picked_up"
  if (/in_transit/.test(normalized)) return "in_transit"
  if (/out_for_delivery/.test(normalized)) return "out_for_delivery"
  if (/delivered/.test(normalized)) return "delivered"
  if (/cancelled|undelivered|rto/.test(normalized)) return "cancelled"
  return null
}

const verifyWebhookSignature = (payload: string, signature: string | null) => {
  if (!env.SHIPROCKET_WEBHOOK_SECRET) return true
  if (!signature) return false
  const expected = crypto.createHmac("sha256", env.SHIPROCKET_WEBHOOK_SECRET).update(payload).digest("hex")
  const provided = signature.trim()
  const left = Buffer.from(expected)
  const right = Buffer.from(provided)
  if (left.length !== right.length) return false
  return crypto.timingSafeEqual(left, right)
}

const authToken = async () => {
  if (!hasShiprocketConfig()) return null
  if (tokenCache && tokenCache.expiresAt > Date.now()) return tokenCache.token
  const res = await fetch(`${shiprocketBaseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: env.SHIPROCKET_EMAIL,
      password: env.SHIPROCKET_PASSWORD,
    }),
  })
  if (!res.ok) {
    throw new Error(`Shiprocket auth failed: ${res.status}`)
  }
  const payload = (await res.json()) as ShiprocketAuthResponse
  if (!payload.token) throw new Error("Shiprocket auth token missing")
  tokenCache = {
    token: payload.token,
    expiresAt: Date.now() + 50 * 60 * 1000,
  }
  return payload.token
}

const trackAwb = async (trackingNo: string) => {
  const token = await authToken()
  if (!token) return null
  const awb = encodeURIComponent(trackingNo)
  const res = await fetch(`${shiprocketBaseUrl}/courier/track/awb/${awb}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  })
  if (!res.ok) {
    if (res.status === 401) tokenCache = null
    return null
  }
  const payload = (await res.json()) as ShiprocketTrackResponse
  const tracking = payload.tracking_data
  const latestTrack = tracking?.shipment_track?.[0]
  const status = latestTrack?.current_status ?? latestTrack?.shipment_status ?? tracking?.current_status ?? tracking?.shipment_status ?? ""
  if (!status) return null
  return {
    shipmentStatus: status,
    mappedOrderStatus: mapShiprocketToOrderStatus(status),
  }
}

export const syncOrderStatusFromShiprocket = async (orderId: string) => {
  if (!hasShiprocketConfig()) return
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      shipments: {
        where: {
          trackingNo: { not: null },
        },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { id: true, trackingNo: true, shipmentStatus: true },
      },
      statusHistory: {
        orderBy: { changedAt: "desc" },
        take: 1,
        select: { toStatus: true },
      },
    },
  })
  if (!order || order.shipments.length === 0) return

  const latestLifecycle = order.statusHistory[0]?.toStatus ?? order.status
  if (["delivered", "cancelled", "returned"].includes(latestLifecycle)) return

  for (const shipment of order.shipments) {
    if (!shipment.trackingNo) continue
    const tracked = await trackAwb(shipment.trackingNo)
    if (!tracked) continue
    await prisma.shipment.update({
      where: { id: shipment.id },
      data: { shipmentStatus: tracked.shipmentStatus.toLowerCase() },
    })
    if (tracked.mappedOrderStatus && tracked.mappedOrderStatus !== latestLifecycle) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: tracked.mappedOrderStatus === "shipped" ? "shipped" : tracked.mappedOrderStatus,
          statusHistory: {
            create: {
              fromStatus: latestLifecycle,
              toStatus: tracked.mappedOrderStatus,
              reasonCode: "shiprocket_sync",
              notes: `Auto-updated from Shiprocket (${tracked.shipmentStatus})`,
            },
          },
        },
      })
    }
    break
  }
}

export const processShiprocketWebhook = async (payloadRaw: string, signature: string | null) => {
  if (!verifyWebhookSignature(payloadRaw, signature)) {
    throw new Error("Invalid Shiprocket webhook signature")
  }
  const payload = JSON.parse(payloadRaw) as Record<string, unknown>
  const event =
    String(payload.event ?? payload.event_name ?? payload.current_status ?? payload.shipment_status ?? "")
  const externalEventId = String(payload.event_id ?? payload.id ?? payload.awb_code ?? "")
  const trackingNo =
    String(payload.awb ?? payload.awb_code ?? payload.tracking_no ?? payload.tracking_id ?? "").trim()
  const explicitOrderId = String(payload.order_id ?? payload.orderId ?? "").trim()

  let orderId = explicitOrderId
  if (!orderId && trackingNo) {
    const shipment = await prisma.shipment.findFirst({
      where: { trackingNo },
      orderBy: { createdAt: "desc" },
      select: { id: true, orderId: true, shipmentStatus: true },
    })
    orderId = shipment?.orderId ?? ""
  }
  if (!orderId) return { applied: false, reason: "order_not_resolved" }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      paymentMethod: true,
      shipments: { orderBy: { createdAt: "desc" }, take: 5, select: { id: true, trackingNo: true, shipmentStatus: true } },
      statusHistory: { orderBy: { changedAt: "desc" }, take: 1, select: { toStatus: true, notes: true } },
    },
  })
  if (!order) return { applied: false, reason: "order_not_found" }

  const latestLifecycle = order.statusHistory[0]?.toStatus ?? order.status
  const targetShipmentStatus = mapShiprocketEventToShipmentStatus(event) ?? normalizeShiprocketState(event)
  const targetOrderStatus = mapShiprocketToOrderStatus(event)
  const isDuplicate =
    order.statusHistory[0]?.notes?.includes(externalEventId) ||
    order.shipments.some((shipment) => shipment.shipmentStatus === targetShipmentStatus)
  if (isDuplicate) return { applied: true, duplicate: true, orderId }

  const shipmentToUpdate = trackingNo
    ? order.shipments.find((shipment) => shipment.trackingNo === trackingNo) ?? order.shipments[0]
    : order.shipments[0]

  await prisma.$transaction(async (tx) => {
    if (shipmentToUpdate) {
      await tx.shipment.update({
        where: { id: shipmentToUpdate.id },
        data: {
          shipmentStatus: targetShipmentStatus,
          deliveredAt: targetOrderStatus === "delivered" ? new Date() : undefined,
        },
      })
    }

    if (targetOrderStatus && targetOrderStatus !== latestLifecycle) {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: targetOrderStatus,
          paymentStatus:
            targetOrderStatus === "delivered" && (order.paymentMethod ?? "").toLowerCase() === "cod"
              ? "SUCCESS"
              : undefined,
          statusHistory: {
            create: {
              fromStatus: latestLifecycle,
              toStatus: targetOrderStatus,
              reasonCode: "shiprocket_webhook",
              notes: `Webhook ${event}${externalEventId ? ` (${externalEventId})` : ""}`,
            },
          },
        },
      })
    }
  })

  return {
    applied: true,
    orderId,
    shipmentStatus: targetShipmentStatus,
    orderStatus: targetOrderStatus,
  }
}
