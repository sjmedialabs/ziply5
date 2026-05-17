import { SHIPMENT_UI_STEPS } from "@/src/lib/shipping/shipment-ui-constants"

export type TrackingActivityDto = {
  id: string
  status: string | null
  message: string | null
  location: string | null
  at: string | null
}

export type OrderTrackingShipmentDto = {
  id: string | null
  courierName: string | null
  awbCode: string | null
  trackingNo: string | null
  trackingUrl: string | null
  shipmentStatus: string | null
  shippingStatus: string | null
  estimatedDeliveryDate: string | null
  lastTrackingSyncAt: string | null
  pickupStatus: string | null
  pickupDate: string | null
  shippedAt: string | null
  deliveredAt: string | null
  shiprocketShipmentId: string | null
  origin: string | null
  destination: string | null
  trackingData?: unknown
}

export type OrderTrackingPayload = {
  orderId: string
  uiStatusLabel: string
  progressIndex: number
  progressSteps: typeof SHIPMENT_UI_STEPS
  estimatedDeliveryDate: string | null
  courierEtaDays: number | null
  isDelayed: boolean
  isTerminal: boolean
  latestActivity: { message: string | null; at: string | null; location: string | null } | null
  activities: TrackingActivityDto[]
  shipment: OrderTrackingShipmentDto | null
  orderSnapshot: {
    shipmentStatus: string | null
    estimatedDeliveryDate: string | null
    awbCode: string | null
    courierName: string | null
    trackingUrl: string | null
    lastTrackingSyncAt: string | null
    shipmentId: string | null
  }
  refreshedFromShiprocket: boolean
}

export type OrderListTrackingSummary = {
  orderId: string
  latestActivity: string | null
  latestAt: string | null
  estimatedDeliveryDate: string | null
  uiStatusLabel: string
  progressIndex: number
  hasShipment: boolean
}
