import { shiprocketClient, getShiprocketConfig } from "@/lib/integrations/shiprocket"
import type {
  ShiprocketServiceabilityResponse,
} from "@/src/server/modules/shipping/shiprocket.types"

export const getShiprocketClientConfig = () => getShiprocketConfig()

export const checkShiprocketServiceability = async (input: {
  pickup_postcode: string
  delivery_postcode: string
  cod: 0 | 1
  weight: number
  declared_value: number
}): Promise<ShiprocketServiceabilityResponse> => {
  return shiprocketClient.checkServiceability(input)
}

export const createShiprocketOrder = async (payload: Record<string, unknown>) => {
  return shiprocketClient.createOrder(payload)
}

export const assignShiprocketAwb = async (input: { shipment_id: number; courier_id?: number }) => {
  return shiprocketClient.assignAwb(input)
}

export const generateShiprocketPickup = async (input: { shipment_id: number }) => {
  return shiprocketClient.generatePickup(input)
}
