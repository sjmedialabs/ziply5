export type ShiprocketAuthResponse = {
  token?: string
}

export type ShiprocketCourierOption = {
  name: string
  eta_days: number
  rate: number
  courier_company_id?: number
  cod_available?: boolean
}

export type ShiprocketServiceabilityResponse = {
  available_couriers: ShiprocketCourierOption[]
}

export type ShiprocketTrackingEvent = {
  status: string
  activityDate?: string | null
  awbCode?: string | null
}

export type ShiprocketTrackingData = {
  shipmentStatus: string
  mappedOrderStatus: "shipped" | "delivered" | "cancelled" | null
}

export type ShiprocketWebhookResult = {
  applied: boolean
  duplicate?: boolean
  reason?: string
  orderId?: string
  shipmentStatus?: string
  orderStatus?: string | null
}

export type OrderShipmentSnapshotInput = {
  shiprocketOrderId?: string | null
  shipmentId?: string | null
  awbCode?: string | null
  courierName?: string | null
  courierCompanyId?: string | null
  trackingNumber?: string | null
  trackingUrl?: string | null
  shippingStatus?: string | null
  shipmentStatus?: string | null
  pickupStatus?: string | null
  shippingCharges?: number | null
  shippingMethod?: string | null
  estimatedDeliveryDate?: Date | null
  shiprocketRawResponse?: unknown
  shipmentCreatedAt?: Date | null
  shipmentSyncedAt?: Date | null
  shipmentDeliveredAt?: Date | null
  lastTrackingSyncAt?: Date | null
  isShipmentCreated?: boolean | null
  isPickupGenerated?: boolean | null
  isLabelGenerated?: boolean | null
  trackingData?: unknown
}
