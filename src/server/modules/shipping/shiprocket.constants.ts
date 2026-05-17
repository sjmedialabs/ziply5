export const SHIPROCKET_DEFAULT_TIMEOUT_MS = 12000
export const SHIPROCKET_MAX_RETRIES = 2
export const SHIPROCKET_TOKEN_SAFETY_WINDOW_MS = 60_000

export const SHIPROCKET_TERMINAL_STATES = new Set(["delivered", "rto", "cancelled"])

export const SHIPROCKET_STATUS_TO_ORDER_STATUS: Record<string, "pending" | "confirmed" | "shipped" | "delivered" | "cancelled"> = {
  new: "confirmed",
  pickup_generated: "confirmed",
  picked_up: "shipped",
  shipped: "shipped",
  in_transit: "shipped",
  out_for_delivery: "shipped",
  delivered: "delivered",
  rto: "cancelled",
  cancelled: "cancelled",
}
