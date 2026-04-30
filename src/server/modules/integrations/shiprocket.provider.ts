import type { ShippingProvider } from "@/src/server/modules/integrations/shipping/shipping.types"
import { processShiprocketWebhook, syncOrderStatusFromShiprocket } from "@/src/server/modules/integrations/shiprocket.service"

export const shiprocketProvider: ShippingProvider = {
  key: "shiprocket",
  async syncOrderStatus(orderId: string) {
    await syncOrderStatusFromShiprocket(orderId)
  },
  async processWebhook(input) {
    return processShiprocketWebhook(input.payloadRaw, input.signature)
  },
}

