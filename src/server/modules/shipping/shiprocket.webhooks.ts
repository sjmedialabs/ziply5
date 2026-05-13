import { processShiprocketWebhook } from "@/src/server/modules/integrations/shiprocket.service"
import { upsertOrderShipmentSnapshotSupabase } from "@/src/lib/db/orders"

export const handleShiprocketWebhook = async (payloadRaw: string, signature: string | null) => {
  const result = await processShiprocketWebhook(payloadRaw, signature)
  if (result?.orderId) {
    await upsertOrderShipmentSnapshotSupabase(result.orderId, {
      shippingStatus: result.shipmentStatus ?? null,
      shipmentStatus: result.shipmentStatus ?? null,
      shipmentSyncedAt: new Date(),
      lastTrackingSyncAt: new Date(),
      shipmentDeliveredAt: result.orderStatus === "delivered" ? new Date() : null,
      trackingData: { webhook: result },
    }).catch(() => null)
  }
  return result
}
