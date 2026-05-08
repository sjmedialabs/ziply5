import { SHIPROCKET_STATUS_TO_ORDER_STATUS } from "@/src/server/modules/shipping/shiprocket.constants"

export const normalizeShiprocketStatus = (value?: string | null) => (value ?? "").trim().toLowerCase().replace(/\s+/g, "_")

export const mapShiprocketStatusToOrderStatus = (value?: string | null) => {
  const normalized = normalizeShiprocketStatus(value)
  return SHIPROCKET_STATUS_TO_ORDER_STATUS[normalized] ?? null
}

export const parseOrderPostalCode = (address?: string | null) => {
  if (!address) return null
  const match = address.match(/\b\d{6}\b/)
  return match?.[0] ?? null
}

export const normalizeShiprocketErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message.trim()) return error.message
  return fallback
}
