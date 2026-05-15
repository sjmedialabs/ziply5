import type { SupabaseOrderRecord } from "@/src/lib/db/orders"
import { getOrderByIdSupabaseBasic } from "@/src/lib/db/orders"
import type {
  OrderTrackingPayload,
  OrderTrackingShipmentDto,
  TrackingActivityDto,
} from "@/src/lib/orders/order-tracking-dto"
import { SHIPMENT_UI_STEPS } from "@/src/lib/shipping/shipment-ui-constants"
import { pgQuery } from "@/src/server/db/pg"
import { refreshShipmentTracking } from "@/src/server/modules/shipping/shiprocket.tracking"

export { SHIPMENT_UI_STEPS } from "@/src/lib/shipping/shipment-ui-constants"
export type { ShipmentUiStepKey } from "@/src/lib/shipping/shipment-ui-constants"
export type { OrderTrackingPayload, OrderTrackingShipmentDto, TrackingActivityDto } from "@/src/lib/orders/order-tracking-dto"

const norm = (s?: string | null) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, "_")

/** Map raw Shiprocket / internal shipment strings to a UI bucket label. */
export const mapShipmentStatusToUiLabel = (raw: string | null | undefined): string => {
  const s = norm(raw)
  if (!s || s === "pending" || s === "new" || s === "processing" || s === "order_placed") return "Order Confirmed"
  if (s.includes("cancel")) return "Cancelled"
  if (s.includes("rto")) return "RTO"
  if (s.includes("lost")) return "Shipment Lost"
  if (s.includes("fail") || s.includes("undelivered")) return "Failed Delivery"
  if (s.includes("delivered")) return "Delivered"
  if (s.includes("out_for_delivery") || s.includes("out-for-delivery") || s.includes("ofd")) return "Out For Delivery"
  if (s.includes("transit") || s.includes("in_transit")) return "In Transit"
  if (s.includes("picked") || s.includes("pickup")) return "Picked Up"
  if (s.includes("awb") || s.includes("label") || s.includes("manifest")) return "AWB Assigned"
  if (s.includes("packed") || s.includes("shipped")) return "In Transit"
  return raw?.trim() ? raw.replaceAll("_", " ") : "Preparing Shipment"
}

const terminalStatuses = (s: string) => {
  const n = norm(s)
  return (
    n.includes("delivered") ||
    n.includes("rto") ||
    n.includes("cancel") ||
    n.includes("lost") ||
    n.includes("fail") ||
    n.includes("destroyed")
  )
}

/** Index of highest completed step (0..5), or -1 if none. */
export const resolveShipmentProgressIndex = (shipmentStatusRaw: string | null | undefined): number => {
  const s = norm(shipmentStatusRaw)
  if (!s) return -1
  if (s.includes("delivered")) return 5
  if (s.includes("out_for") || s.includes("ofd")) return 4
  if (s.includes("transit") || s.includes("in_transit") || s.includes("shipped") || s.includes("manifest")) return 3
  if (s.includes("picked") || s.includes("pickup")) return 2
  if (s.includes("awb") || s.includes("label")) return 1
  if (s.includes("new") || s.includes("processing") || s.includes("pending") || s.includes("confirmed")) return 0
  return 0
}

const safeIso = (d: unknown): string | null => {
  if (d == null) return null
  const t = d instanceof Date ? d.getTime() : new Date(String(d)).getTime()
  if (Number.isNaN(t)) return null
  return new Date(t).toISOString()
}

const parseEtaDaysFromTracking = (trackingData: unknown): number | null => {
  if (!trackingData || typeof trackingData !== "object") return null
  const t = trackingData as Record<string, unknown>
  const raw =
    t.courier_eta_days ??
    t.courierEtaDays ??
    t.estimated_delivery_days ??
    t.estimated_delivery_sla ??
    t.sla
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null
}

export const getLatestTrackingSummariesForOrderIds = async (
  orderIds: string[],
): Promise<
  Array<{
    orderId: string
    latestActivity: string | null
    latestAt: string | null
    estimatedDeliveryDate: string | null
    uiStatusLabel: string
    progressIndex: number
    hasShipment: boolean
  }>
> => {
  if (!orderIds.length) return []
  const fallback = (orderId: string) => ({
    orderId,
    latestActivity: null as string | null,
    latestAt: null as string | null,
    estimatedDeliveryDate: null as string | null,
    uiStatusLabel: "Preparing Shipment",
    progressIndex: -1,
    hasShipment: false,
  })
  try {
    const rows = await pgQuery<
      Array<{
        order_id: string
        activity: string | null
        activity_date: string | null
        shipment_status: string | null
        edd: string | null
      }>
    >(
      `
      SELECT DISTINCT ON (s."orderId")
        s."orderId" as order_id,
        ev.activity,
        ev."activityDate" as activity_date,
        s."shipmentStatus" as shipment_status,
        s."estimatedDeliveryDate" as edd
      FROM "Shipment" s
      LEFT JOIN LATERAL (
        SELECT x.activity, x."activityDate"
        FROM "ShipmentTrackingEvent" x
        WHERE x."shipmentId" = s.id
        ORDER BY x."activityDate" DESC NULLS LAST, x."createdAt" DESC
        LIMIT 1
      ) ev ON true
      WHERE s."orderId" = ANY($1::text[])
      ORDER BY s."orderId", s."createdAt" DESC
      `,
      [orderIds],
    )
    const byId = new Map(
      rows.map((r) => {
        const ui = mapShipmentStatusToUiLabel(r.shipment_status)
        return [
          String(r.order_id),
          {
            orderId: String(r.order_id),
            latestActivity: r.activity,
            latestAt: r.activity_date ? safeIso(r.activity_date) : null,
            estimatedDeliveryDate: r.edd ? safeIso(r.edd) : null,
            uiStatusLabel: ui,
            progressIndex: resolveShipmentProgressIndex(r.shipment_status),
            hasShipment: true,
          },
        ]
      }),
    )
    return orderIds.map((id) => byId.get(id) ?? fallback(id))
  } catch {
    return orderIds.map(fallback)
  }
}

const loadActivitiesForOrder = async (orderId: string, limit: number): Promise<TrackingActivityDto[]> => {
  try {
    const rows = await pgQuery<
      Array<{
        id: string
        status: string | null
        activity: string | null
        location: string | null
        activity_date: string | null
      }>
    >(
      `
      SELECT e.id, e.status, e.activity, e.location, e."activityDate" as activity_date
      FROM "ShipmentTrackingEvent" e
      INNER JOIN "Shipment" s ON s.id = e."shipmentId"
      WHERE s."orderId" = $1
      ORDER BY e."activityDate" DESC NULLS LAST, e."createdAt" DESC
      LIMIT $2
      `,
      [orderId, limit],
    )
    return rows.map((r) => ({
      id: String(r.id),
      status: r.status,
      message: r.activity,
      location: r.location,
      at: r.activity_date ? safeIso(r.activity_date) : null,
    }))
  } catch {
    return []
  }
}

const loadPrimaryShipment = async (orderId: string): Promise<OrderTrackingShipmentDto | null> => {
  try {
    const rows = await pgQuery<
      Array<{
        id: string
        courier_name: string | null
        awb_code: string | null
        tracking_no: string | null
        tracking_url: string | null
        shipment_status: string | null
        shipping_status: string | null
        estimated_delivery_date: string | null
        last_tracking_sync_at: string | null
        pickup_status: string | null
        pickup_date: string | null
        shipped_at: string | null
        delivered_at: string | null
        delivered_date: string | null
        shiprocket_shipment_id: string | null
        tracking_data: unknown | null
        origin: string | null
        destination: string | null
      }>
    >(
      `
      SELECT
        s.id,
        s."courierName" as courier_name,
        s."awbCode" as awb_code,
        s."trackingNo" as tracking_no,
        s."trackingUrl" as tracking_url,
        s."shipmentStatus" as shipment_status,
        s."shippingStatus" as shipping_status,
        s."estimatedDeliveryDate" as estimated_delivery_date,
        s."lastTrackingSyncAt" as last_tracking_sync_at,
        s."pickupStatus" as pickup_status,
        s."pickupDate" as pickup_date,
        s."shippedAt" as shipped_at,
        s."deliveredAt" as delivered_at,
        s."shiprocketShipmentId" as shiprocket_shipment_id,
        s."trackingData" as tracking_data,
        s."origin" as origin,
        s."destination" as destination
      FROM "Shipment" s
      WHERE s."orderId" = $1
      ORDER BY s."createdAt" DESC
      LIMIT 1
      `,
      [orderId],
    )
    const r = rows[0]
    if (!r) return null
    return {
      id: String(r.id),
      courierName: r.courier_name,
      awbCode: r.awb_code,
      trackingNo: r.tracking_no,
      trackingUrl: r.tracking_url,
      shipmentStatus: r.shipment_status,
      shippingStatus: r.shipping_status,
      estimatedDeliveryDate: r.estimated_delivery_date ? safeIso(r.estimated_delivery_date) : null,
      lastTrackingSyncAt: r.last_tracking_sync_at ? safeIso(r.last_tracking_sync_at) : null,
      pickupStatus: r.pickup_status,
      pickupDate: r.pickup_date ? safeIso(r.pickup_date) : null,
      shippedAt: r.shipped_at ? safeIso(r.shipped_at) : null,
      deliveredAt: r.delivered_at ? safeIso(r.delivered_at) : null,
      shiprocketShipmentId: r.shiprocket_shipment_id ? String(r.shiprocket_shipment_id) : null,
      trackingData: r.tracking_data ?? undefined,
      origin: r.origin,
      destination: r.destination,
    }
  } catch {
    return null
  }
}

const activitiesFromOrderTrackingData = (trackingData: unknown): TrackingActivityDto[] => {
  if (!trackingData || typeof trackingData !== "object") return []
  const t = trackingData as Record<string, unknown>
  const arr = t.shipment_track_activities
  if (!Array.isArray(arr)) return []
  const out: TrackingActivityDto[] = []
  let i = 0
  for (const raw of arr) {
    if (!raw || typeof raw !== "object") continue
    const a = raw as Record<string, unknown>
    const dateRaw = a.date ?? a.activity_date ?? a.created_at
    out.push({
      id: `td-${i++}`,
      status: a.status ? String(a.status) : a.current_status ? String(a.current_status) : null,
      message: a.activity ? String(a.activity) : a.status ? String(a.status) : null,
      location: a.location ? String(a.location) : a.activity_location ? String(a.activity_location) : null,
      at: dateRaw ? safeIso(dateRaw) : null,
    })
  }
  out.sort((x, y) => {
    const tx = x.at ? new Date(x.at).getTime() : 0
    const ty = y.at ? new Date(y.at).getTime() : 0
    return ty - tx
  })
  return out.slice(0, 100)
}

const dedupeTrackingActivities = (acts: TrackingActivityDto[]): TrackingActivityDto[] => {
  const seen = new Set<string>()
  const out: TrackingActivityDto[] = []
  for (const a of acts) {
    const k = `${a.at ?? ""}|${String(a.message ?? "").trim()}|${String(a.location ?? "").trim()}|${String(a.status ?? "").trim()}`
    if (seen.has(k)) continue
    seen.add(k)
    out.push(a)
  }
  return out
}

export const buildCustomerOrderTrackingPayload = async (input: {
  orderId: string
  order?: SupabaseOrderRecord | null
  refresh?: boolean
  activitiesLimit?: number
}): Promise<OrderTrackingPayload> => {
  const limit = Math.min(Math.max(input.activitiesLimit ?? 80, 1), 200)
  const order = input.order ?? (await getOrderByIdSupabaseBasic(input.orderId))
  if (!order) {
    throw new Error("Order not found")
  }

  let shipment = await loadPrimaryShipment(input.orderId)
  let refreshed = false

  if (input.refresh && shipment?.awbCode) {
    const term = terminalStatuses(shipment.shipmentStatus ?? shipment.shippingStatus ?? "")
    if (!term) {
      try {
        await refreshShipmentTracking(input.orderId)
        refreshed = true
        shipment = await loadPrimaryShipment(input.orderId)
      } catch {
        /* keep cached */
      }
    }
  }

  const orderEdd = safeIso((order as Record<string, unknown>).estimatedDeliveryDate ?? null)
  const shipEdd = shipment?.estimatedDeliveryDate ?? null
  const estimatedDeliveryDate = shipEdd ?? orderEdd

  const shipmentStatusForUi =
    shipment?.shipmentStatus ?? (order as Record<string, unknown>).shipmentStatus ?? (order as Record<string, unknown>).shippingStatus ?? null

  const uiStatusLabel = mapShipmentStatusToUiLabel(String(shipmentStatusForUi ?? ""))
  const progressIndex = resolveShipmentProgressIndex(String(shipmentStatusForUi ?? ""))

  let activities = dedupeTrackingActivities(await loadActivitiesForOrder(input.orderId, limit))
  if (!activities.length) {
    const td = shipment?.trackingData ?? (order as Record<string, unknown>).trackingData
    activities = dedupeTrackingActivities(activitiesFromOrderTrackingData(td))
  }

  const latest = activities[0] ?? null
  const courierEtaDays =
    parseEtaDaysFromTracking(shipment?.trackingData) ?? parseEtaDaysFromTracking((order as Record<string, unknown>).trackingData)

  const now = Date.now()
  const eddMs = estimatedDeliveryDate ? new Date(estimatedDeliveryDate).getTime() : NaN
  const isDelayed =
    Number.isFinite(eddMs) &&
    eddMs < now &&
    !norm(String(shipmentStatusForUi)).includes("delivered") &&
    !terminalStatuses(String(shipmentStatusForUi))

  const isTerminal = terminalStatuses(String(shipmentStatusForUi))

  return {
    orderId: input.orderId,
    uiStatusLabel,
    progressIndex,
    progressSteps: SHIPMENT_UI_STEPS,
    estimatedDeliveryDate,
    courierEtaDays,
    isDelayed,
    isTerminal,
    latestActivity: latest
      ? { message: latest.message ?? latest.status, at: latest.at, location: latest.location }
      : null,
    activities,
    shipment,
    orderSnapshot: {
      shipmentStatus: (order as Record<string, unknown>).shipmentStatus as string | null,
      estimatedDeliveryDate: orderEdd,
      awbCode: (order as Record<string, unknown>).awbCode as string | null,
      courierName: (order as Record<string, unknown>).courierName as string | null,
      trackingUrl: (order as Record<string, unknown>).trackingUrl as string | null,
      lastTrackingSyncAt: safeIso((order as Record<string, unknown>).lastTrackingSyncAt ?? null),
      shipmentId: (order as Record<string, unknown>).shipmentId as string | null,
    },
    refreshedFromShiprocket: refreshed,
  }
}
