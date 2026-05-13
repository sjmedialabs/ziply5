import { randomUUID } from "crypto"
import { pgQuery, pgTx } from "@/src/server/db/pg"
import { getShiprocketToken } from "@/lib/integrations/shiprocket"
import { upsertOrderShipmentSnapshotSupabase } from "@/src/lib/db/orders"
import { logger } from "@/lib/logger"

const trackingConsole = (step: string, details?: unknown) => {
  if (details === undefined) {
    console.log(`[shiprocket][${step}]`)
    return
  }
  console.log(`[shiprocket][${step}]`, details)
}

type TrackingPayload = {
  tracking_data?: {
    track_status?: number
    shipment_status?: number
    shipment_track?: Array<Record<string, unknown>>
    shipment_track_activities?: Array<Record<string, unknown>>
    track_url?: string
    etd?: string
    [key: string]: unknown
  }
  [key: string]: unknown
}

const ACTIVE_SHIPMENT_STATUSES = new Set(["awb_assigned", "picked_up", "in_transit", "out_for_delivery"])
const TERMINAL_SHIPMENT_STATUSES = new Set(["delivered", "cancelled", "rto_delivered"])

const normalizeStatus = (value?: string | null) => String(value ?? "").trim().toLowerCase().replace(/\s+/g, "_")

export const mapShiprocketToInternalStatus = (shiprocketStatus?: string | null) => {
  const normalized = normalizeStatus(shiprocketStatus)
  if (normalized.includes("awb_assigned")) return "PROCESSING"
  if (normalized.includes("picked_up")) return "SHIPPED"
  if (normalized.includes("in_transit")) return "IN_TRANSIT"
  if (normalized.includes("out_for_delivery")) return "OUT_FOR_DELIVERY"
  if (normalized.includes("delivered")) return "DELIVERED"
  if (normalized.includes("rto")) return "RETURNED"
  return "PROCESSING"
}

const parseTrackingResponse = (payload: TrackingPayload) => {
  const track = payload.tracking_data ?? {}
  const latest = Array.isArray(track.shipment_track) ? (track.shipment_track[0] ?? {}) : {}
  const status = String(latest.current_status ?? latest.shipment_status ?? "")
  const statusCode = Number(latest.current_status_id ?? latest.shipment_status_id ?? track.shipment_status ?? 0)
  const courierName = String(latest.courier_name ?? "")
  const awbCode = String(latest.awb_code ?? "")
  const trackUrl = track.track_url ? String(track.track_url) : null
  const etd = track.etd ? String(track.etd) : latest.edd ? String(latest.edd) : null
  const activities = Array.isArray(track.shipment_track_activities) ? track.shipment_track_activities : []
  const parsed = {
    status,
    statusCode: Number.isFinite(statusCode) ? statusCode : null,
    courierName: courierName || null,
    awbCode: awbCode || null,
    trackUrl,
    etd,
    activities,
    raw: payload,
  }
  trackingConsole("tracking.parse.response", parsed)
  return parsed
}

const fetchTrackingByAwb = async (awbCode: string): Promise<TrackingPayload> => {
  trackingConsole("tracking.fetch.start", { awbCode })
  const token = await getShiprocketToken()
  const baseUrl = (process.env.SHIPROCKET_BASE_URL ?? "https://apiv2.shiprocket.in/v1/external").replace(/\/+$/, "")
  const res = await fetch(`${baseUrl}/courier/track/awb/${encodeURIComponent(awbCode)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  })
  const rawText = await res.text()
  if (!res.ok) {
    trackingConsole("tracking.fetch.failed", { awbCode, status: res.status, body: rawText.slice(0, 500) })
    throw new Error(`Tracking API failed (${res.status}): ${rawText.slice(0, 500)}`)
  }
  try {
    const parsed = JSON.parse(rawText) as TrackingPayload
    trackingConsole("tracking.fetch.raw_response", { awbCode, response: parsed })
    return parsed
  } catch {
    throw new Error("Tracking API returned invalid JSON")
  }
}

const upsertTrackingEvents = async (shipmentId: string, awbCode: string, activities: Array<Record<string, unknown>>) => {
  trackingConsole("tracking.events.upsert.start", { shipmentId, awbCode, count: activities.length })
  for (const activity of activities) {
    const status = String(activity.status ?? activity.current_status ?? "")
    const statusCodeRaw = Number(activity.status_code ?? activity.current_status_id ?? 0)
    const statusCode = Number.isFinite(statusCodeRaw) ? statusCodeRaw : null
    const location = String(activity.location ?? activity.activity_location ?? "")
    const activityLabel = String(activity.activity ?? activity.current_status ?? status)
    const activityDateRaw = String(activity.date ?? activity.activity_date ?? activity.created_at ?? "")
    const activityDate = activityDateRaw ? new Date(activityDateRaw) : null
    await pgQuery(
      `
      INSERT INTO "ShipmentTrackingEvent" ("id","shipmentId","awbCode","status","statusCode","activity","location","activityDate","rawEvent","createdAt")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,now())
      ON CONFLICT ("shipmentId","awbCode","statusCode","activityDate") DO NOTHING
      `,
      [
        randomUUID(),
        shipmentId,
        awbCode,
        status || null,
        statusCode,
        activityLabel || null,
        location || null,
        activityDate ? activityDate.toISOString() : null,
        JSON.stringify(activity ?? {}),
      ],
    )
    trackingConsole("tracking.events.upsert.item", {
      shipmentId,
      awbCode,
      status: status || null,
      statusCode,
      activityDate: activityDate ? activityDate.toISOString() : null,
    })
  }
  trackingConsole("tracking.events.upsert.done", { shipmentId, awbCode })
}

export const syncShipmentTrackingByAwb = async (awbCode: string) => {
  trackingConsole("tracking.sync_by_awb.start", { awbCode })
  logger.info("shiprocket.tracking.sync.started", { awbCode })
  const shipmentRows = await pgQuery<Array<{ id: string; orderId: string; shipmentNo: string | null }>>(
    `SELECT id, "orderId", "shipmentNo" FROM "Shipment" WHERE "trackingNo" = $1 OR "awbCode" = $1 ORDER BY "createdAt" DESC LIMIT 1`,
    [awbCode],
  )
  const shipment = shipmentRows[0]
  if (!shipment) throw new Error("Shipment not found for AWB")
  trackingConsole("tracking.sync_by_awb.shipment_lookup", { awbCode, shipment })
  const rawTracking = await fetchTrackingByAwb(awbCode)
  const parsed = parseTrackingResponse(rawTracking)
  const internalStatus = mapShiprocketToInternalStatus(parsed.status)
  trackingConsole("tracking.sync_by_awb.mapped_status", { awbCode, shiprocketStatus: parsed.status, internalStatus })
  await pgTx(async (tx) => {
    await tx.query(
      `
      UPDATE "Shipment"
      SET "currentStatus"=$2,
          "currentStatusId"=$3,
          "trackingUrl"=COALESCE($4,"trackingUrl"),
          "estimatedDeliveryDate"=COALESCE($5::timestamptz,"estimatedDeliveryDate"),
          "courierName"=COALESCE($6,"courierName"),
          "trackingRawResponse"=$7::jsonb,
          "rawShiprocketResponse"=$7::jsonb,
          "lastTrackingSyncAt"=now(),
          "shippingStatus"=$8,
          "shipmentStatus"=$8,
          "deliveredDate"=CASE WHEN $8='DELIVERED' THEN now() ELSE "deliveredDate" END,
          "updatedAt"=now()
      WHERE id=$1
      `,
      [
        shipment.id,
        parsed.status || null,
        parsed.statusCode,
        parsed.trackUrl,
        parsed.etd,
        parsed.courierName,
        JSON.stringify(parsed.raw),
        internalStatus,
      ],
    )
  })
  trackingConsole("tracking.sync_by_awb.shipment_updated", {
    orderId: shipment.orderId,
    shipmentId: shipment.id,
    awbCode,
    currentStatus: parsed.status,
    statusCode: parsed.statusCode,
    trackingUrl: parsed.trackUrl,
  })
  await upsertTrackingEvents(shipment.id, awbCode, parsed.activities)
  await upsertOrderShipmentSnapshotSupabase(shipment.orderId, {
    awbCode,
    trackingNumber: awbCode,
    courierName: parsed.courierName ?? null,
    trackingUrl: parsed.trackUrl,
    estimatedDeliveryDate: parsed.etd ? new Date(parsed.etd) : null,
    shippingStatus: internalStatus,
    shipmentStatus: internalStatus,
    lastTrackingSyncAt: new Date(),
    shipmentDeliveredAt: internalStatus === "DELIVERED" ? new Date() : null,
    trackingData: parsed.raw,
    shiprocketRawResponse: parsed.raw,
  })
  trackingConsole("tracking.sync_by_awb.order_snapshot_updated", {
    orderId: shipment.orderId,
    awbCode,
    shippingStatus: internalStatus,
    trackingUrl: parsed.trackUrl,
    etd: parsed.etd,
  })
  logger.info("shiprocket.tracking.sync.success", {
    orderId: shipment.orderId,
    shipmentId: shipment.id,
    awbCode,
    shippingStatus: internalStatus,
  })
  return {
    success: true,
    orderId: shipment.orderId,
    shipmentId: shipment.id,
    awbCode,
    courierName: parsed.courierName,
    trackingUrl: parsed.trackUrl,
    estimatedDeliveryDate: parsed.etd,
    shippingStatus: internalStatus,
  }
}

export const syncShipmentTracking = async (orderId: string) => {
  trackingConsole("tracking.sync_by_order.start", { orderId })
  logger.info("shiprocket.tracking.sync.started", { orderId })
  const shipmentRows = await pgQuery<Array<{ id: string; trackingNo: string | null; awbCode: string | null }>>(
    `SELECT id, "trackingNo", "awbCode" FROM "Shipment" WHERE "orderId" = $1 ORDER BY "createdAt" DESC LIMIT 1`,
    [orderId],
  )
  const shipment = shipmentRows[0]
  if (!shipment) throw new Error("Shipment not found for order")
  trackingConsole("tracking.sync_by_order.shipment_lookup", { orderId, shipment })
  const awbCode = shipment.trackingNo ?? shipment.awbCode
  if (!awbCode) throw new Error("AWB code missing for shipment")
  trackingConsole("tracking.sync_by_order.awb_resolved", { orderId, awbCode })
  return syncShipmentTrackingByAwb(awbCode)
}

export const syncAllActiveShipments = async () => {
  trackingConsole("tracking.sync_all.start")
  const rows = await pgQuery<Array<{ orderId: string; trackingNo: string | null; awbCode: string | null; shippingStatus: string | null; shipmentStatus: string | null }>>(
    `
    SELECT DISTINCT ON ("orderId")
      "orderId","trackingNo","awbCode","shippingStatus","shipmentStatus"
    FROM "Shipment"
    WHERE COALESCE("trackingNo","awbCode") IS NOT NULL
    ORDER BY "orderId","createdAt" DESC
    `,
    [],
  )
  const results: Array<{ orderId: string; status: "synced" | "skipped" | "failed"; reason?: string }> = []
  for (const row of rows) {
    trackingConsole("tracking.sync_all.row", row)
    const normalized = normalizeStatus(row.shippingStatus ?? row.shipmentStatus ?? "")
    if (TERMINAL_SHIPMENT_STATUSES.has(normalized)) {
      results.push({ orderId: row.orderId, status: "skipped", reason: "terminal_status" })
      trackingConsole("tracking.sync_all.skipped_terminal", { orderId: row.orderId })
      continue
    }
    if (normalized && !ACTIVE_SHIPMENT_STATUSES.has(normalized)) {
      results.push({ orderId: row.orderId, status: "skipped", reason: "inactive_status" })
      trackingConsole("tracking.sync_all.skipped_inactive", { orderId: row.orderId, normalized })
      continue
    }
    try {
      await syncShipmentTrackingByAwb(row.trackingNo ?? row.awbCode ?? "")
      results.push({ orderId: row.orderId, status: "synced" })
      trackingConsole("tracking.sync_all.synced", { orderId: row.orderId, awbCode: row.trackingNo ?? row.awbCode ?? null })
    } catch (error) {
      logger.error("shiprocket.tracking.sync.failed", {
        orderId: row.orderId,
        awbCode: row.trackingNo ?? row.awbCode ?? null,
        reason: error instanceof Error ? error.message : "unknown",
      })
      results.push({
        orderId: row.orderId,
        status: "failed",
        reason: error instanceof Error ? error.message : "unknown",
      })
      trackingConsole("tracking.sync_all.failed", {
        orderId: row.orderId,
        awbCode: row.trackingNo ?? row.awbCode ?? null,
        reason: error instanceof Error ? error.message : "unknown",
      })
    }
  }
  const output = {
    total: results.length,
    synced: results.filter((r) => r.status === "synced").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    failed: results.filter((r) => r.status === "failed").length,
    results,
  }
  trackingConsole("tracking.sync_all.done", output)
  return output
}
