import type { ShippingProvider } from "./shipping.types"
import { shiprocketProvider } from "@/src/server/modules/integrations/shiprocket.provider"

const providers: ShippingProvider[] = [shiprocketProvider]

export const getShippingProvider = (key?: string | null) => {
  const normalized = (key ?? "shiprocket").toLowerCase()
  return providers.find((p) => p.key === normalized) ?? shiprocketProvider
}

export const listShippingProviders = () => providers.map((p) => ({ key: p.key }))

