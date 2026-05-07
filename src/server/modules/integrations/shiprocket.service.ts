import crypto from "node:crypto"
import { pgQuery, pgTx } from "@/src/server/db/pg"
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

const normalizeStaticShiprocketToken = () => {
  const raw = env.SHIPROCKET_TOKEN?.trim() || env.SHIPROCKET_API_KEY?.trim()
  return raw ? raw.replace(/^Bearer\s+/i, "") : ""
}

const hasShiprocketConfig = () =>
  Boolean((env.SHIPROCKET_EMAIL?.trim() && env.SHIPROCKET_PASSWORD) || normalizeStaticShiprocketToken())
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
  const fromEnv = normalizeStaticShiprocketToken()
  if (fromEnv) return fromEnv
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
    expiresAt: Date.now() + 23 * 60 * 60 * 1000,
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
  const orderRows = await pgQuery<
    Array<{
      id: string
      status: string
      paymentMethod: string | null
      shipments: unknown
      statusHistory: unknown
    }>
  >(
    `
      SELECT
        o.id,
        o.status,
        o."paymentMethod",
        COALESCE((
          SELECT jsonb_agg(jsonb_build_object('id', s.id, 'trackingNo', s."trackingNo", 'shipmentStatus', s."shipmentStatus", 'createdAt', s."createdAt") ORDER BY s."createdAt" DESC)
          FROM "Shipment" s
          WHERE s."orderId" = o.id AND s."trackingNo" IS NOT NULL
          LIMIT 3
        ), '[]'::jsonb) as shipments,
        COALESCE((
          SELECT jsonb_agg(jsonb_build_object('toStatus', h."toStatus", 'notes', h.notes, 'changedAt', h."changedAt") ORDER BY h."changedAt" DESC)
          FROM "OrderStatusHistory" h
          WHERE h."orderId" = o.id
          LIMIT 1
        ), '[]'::jsonb) as "statusHistory"
      FROM "Order" o
      WHERE o.id = $1
      LIMIT 1
    `,
    [orderId],
  )
  const order = orderRows[0] as any
  const shipments = Array.isArray(order?.shipments) ? (order.shipments as any[]) : []
  const statusHistory = Array.isArray(order?.statusHistory) ? (order.statusHistory as any[]) : []
  if (!order || shipments.length === 0) return

  const latestLifecycle = statusHistory[0]?.toStatus ?? order.status
  if (["delivered", "cancelled", "returned"].includes(latestLifecycle)) return

  for (const shipment of shipments) {
    if (!shipment.trackingNo) continue
    const tracked = await trackAwb(shipment.trackingNo)
    if (!tracked) continue
    await pgQuery(`UPDATE "Shipment" SET "shipmentStatus" = $2, "updatedAt" = now() WHERE id = $1`, [
      shipment.id,
      tracked.shipmentStatus.toLowerCase(),
    ])
    if (tracked.mappedOrderStatus && tracked.mappedOrderStatus !== latestLifecycle) {
      const toStatus = tracked.mappedOrderStatus
      await pgTx(async (client) => {
        await client.query(`UPDATE "Order" SET status=$2, "updatedAt"=now() WHERE id=$1`, [
          order.id,
          toStatus === "shipped" ? "shipped" : toStatus,
        ])
        await client.query(
          `
            INSERT INTO "OrderStatusHistory" (id, "orderId", "fromStatus", "toStatus", "reasonCode", notes, "changedAt")
            VALUES (gen_random_uuid()::text, $1, $2, $3, 'shiprocket_sync', $4, now())
          `,
          [order.id, latestLifecycle, toStatus, `Auto-updated from Shiprocket (${tracked.shipmentStatus})`],
        )
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
    const rows = await pgQuery<Array<{ orderId: string }>>(
      `SELECT "orderId" FROM "Shipment" WHERE "trackingNo" = $1 ORDER BY "createdAt" DESC LIMIT 1`,
      [trackingNo],
    )
    orderId = rows[0]?.orderId ?? ""
  }
  if (!orderId) return { applied: false, reason: "order_not_resolved" }

  const orderRows = await pgQuery<
    Array<{
      id: string
      status: string
      paymentMethod: string | null
      shipments: unknown
      statusHistory: unknown
    }>
  >(
    `
      SELECT
        o.id,
        o.status,
        o."paymentMethod",
        COALESCE((
          SELECT jsonb_agg(jsonb_build_object('id', s.id, 'trackingNo', s."trackingNo", 'shipmentStatus', s."shipmentStatus", 'createdAt', s."createdAt") ORDER BY s."createdAt" DESC)
          FROM "Shipment" s
          WHERE s."orderId" = o.id
          LIMIT 5
        ), '[]'::jsonb) as shipments,
        COALESCE((
          SELECT jsonb_agg(jsonb_build_object('toStatus', h."toStatus", 'notes', h.notes, 'changedAt', h."changedAt") ORDER BY h."changedAt" DESC)
          FROM "OrderStatusHistory" h
          WHERE h."orderId" = o.id
          LIMIT 1
        ), '[]'::jsonb) as "statusHistory"
      FROM "Order" o
      WHERE o.id = $1
      LIMIT 1
    `,
    [orderId],
  )
  const order = orderRows[0] as any
  if (!order) return { applied: false, reason: "order_not_found" }

  const shipments = Array.isArray(order.shipments) ? (order.shipments as any[]) : []
  const statusHistory = Array.isArray(order.statusHistory) ? (order.statusHistory as any[]) : []
  const latestLifecycle = statusHistory[0]?.toStatus ?? order.status
  const targetShipmentStatus = mapShiprocketEventToShipmentStatus(event) ?? normalizeShiprocketState(event)
  const targetOrderStatus = mapShiprocketToOrderStatus(event)
  const isDuplicate =
    statusHistory[0]?.notes?.includes(externalEventId) || shipments.some((shipment: any) => shipment.shipmentStatus === targetShipmentStatus)
  if (isDuplicate) return { applied: true, duplicate: true, orderId }

  const shipmentToUpdate = trackingNo
    ? shipments.find((shipment: any) => shipment.trackingNo === trackingNo) ?? shipments[0]
    : shipments[0]

  await pgTx(async (tx) => {
    if (shipmentToUpdate) {
      await tx.query(
        `UPDATE "Shipment" SET "shipmentStatus"=$2, "deliveredAt"=CASE WHEN $3='delivered' THEN now() ELSE "deliveredAt" END, "updatedAt"=now() WHERE id=$1`,
        [shipmentToUpdate.id, targetShipmentStatus, targetOrderStatus ?? ""],
      )
    }

    if (targetOrderStatus && targetOrderStatus !== latestLifecycle) {
      await tx.query(
        `UPDATE "Order" SET status=$2, "paymentStatus"=CASE WHEN $2='delivered' AND lower(COALESCE($3,''))='cod' THEN 'SUCCESS' ELSE "paymentStatus" END, "updatedAt"=now() WHERE id=$1`,
        [order.id, targetOrderStatus, order.paymentMethod ?? ""],
      )
      await tx.query(
        `
          INSERT INTO "OrderStatusHistory" (id, "orderId", "fromStatus", "toStatus", "reasonCode", notes, "changedAt")
          VALUES (gen_random_uuid()::text, $1, $2, $3, 'shiprocket_webhook', $4, now())
        `,
        [order.id, latestLifecycle, targetOrderStatus, `Webhook ${event}${externalEventId ? ` (${externalEventId})` : ""}`],
      )
    }
  })

  return {
    applied: true,
    orderId,
    shipmentStatus: targetShipmentStatus,
    orderStatus: targetOrderStatus,
  }
}
