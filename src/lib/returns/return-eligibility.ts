import { differenceInCalendarDays } from "date-fns"

const TERMINAL_RETURN_STATUSES = new Set([
  "rejected",
  "cancelled",
  "completed",
  "refunded",
])

export const isReturnStatusActive = (status: string | null | undefined) => {
  const s = String(status ?? "").toLowerCase().trim()
  if (!s) return false
  return !TERMINAL_RETURN_STATUSES.has(s)
}

export type OrderReturnEligibilityInput = {
  orderStatus: string
  /** Latest lifecycle from OrderStatusHistory[0] or equivalent */
  latestLifecycle?: string | null
  /** Best-known customer delivery moment (shipment deliveredAt or history delivered changedAt) */
  deliveredAt: Date | null
}

export const isOrderDeliveredForReturn = (input: OrderReturnEligibilityInput) => {
  const os = String(input.orderStatus ?? "").toLowerCase()
  const life = String(input.latestLifecycle ?? "").toLowerCase()
  return os === "delivered" || life === "delivered"
}

/** Returns null if eligible, otherwise a short error code for APIs/UI. */
export const getReturnIneligibilityReason = (
  input: OrderReturnEligibilityInput & { now?: Date; returnWindowDays?: number },
): string | null => {
  const now = input.now ?? new Date()
  const windowDays = input.returnWindowDays ?? 7

  if (!isOrderDeliveredForReturn(input)) {
    return "not_delivered"
  }
  if (!input.deliveredAt || Number.isNaN(input.deliveredAt.getTime())) {
    return "missing_delivered_at"
  }
  if (differenceInCalendarDays(now, input.deliveredAt) > windowDays) {
    return "return_window_expired"
  }
  return null
}
