export type ShippingWebhookInput = {
  payloadRaw: string
  signature: string | null
}

export type ShippingSyncResult = {
  applied: boolean
  duplicate?: boolean
  orderId?: string
  reason?: string
}

export interface ShippingProvider {
  key: string
  syncOrderStatus(orderId: string): Promise<void>
  processWebhook(input: ShippingWebhookInput): Promise<ShippingSyncResult>
}

