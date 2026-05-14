import type { ShiprocketCourierOption } from "@/src/server/modules/shipping/shiprocket.types"

export type ServiceabilityUiStatus = "deliverable" | "limited_service" | "not_deliverable" | "api_unavailable"

export type NormalizedServiceability = {
  status: ServiceabilityUiStatus
  deliverable: boolean
  courierCount: number
  estimatedDeliveryDaysMin: number | null
  estimatedDeliveryDaysMax: number | null
  codAvailable: boolean
  prepaidAvailable: boolean
  /** Courier summary for UI — no Shiprocket freight rates exposed. */
  couriers: Array<{ name: string; etaDays: number; codAvailable: boolean }>
}

const etaFromCourier = (c: ShiprocketCourierOption) => {
  const n = Number(c.eta_days)
  return Number.isFinite(n) && n > 0 ? n : null
}

export const normalizeShiprocketCouriersForUi = (
  raw: ShiprocketCourierOption[],
): NormalizedServiceability => {
  const couriers = raw.map((c) => ({
    name: c.name,
    etaDays: Math.max(1, Math.round(Number(c.eta_days) || 1)),
    codAvailable: c.cod_available !== false,
  }))

  const courierCount = couriers.length
  const etas = couriers.map((c) => c.etaDays).filter((d) => Number.isFinite(d))
  const estimatedDeliveryDaysMin = etas.length ? Math.min(...etas) : null
  const estimatedDeliveryDaysMax = etas.length ? Math.max(...etas) : null

  const codAvailable = couriers.some((c) => c.codAvailable)
  const prepaidAvailable = courierCount > 0

  if (courierCount === 0) {
    return {
      status: "not_deliverable",
      deliverable: false,
      courierCount: 0,
      estimatedDeliveryDaysMin: null,
      estimatedDeliveryDaysMax: null,
      codAvailable: false,
      prepaidAvailable: false,
      couriers: [],
    }
  }

  const limitedByCourierCount = courierCount === 1
  const limitedByEta =
    estimatedDeliveryDaysMax != null && estimatedDeliveryDaysMax >= 7

  const status: ServiceabilityUiStatus =
    limitedByCourierCount || limitedByEta ? "limited_service" : "deliverable"

  return {
    status,
    deliverable: true,
    courierCount,
    estimatedDeliveryDaysMin,
    estimatedDeliveryDaysMax,
    codAvailable,
    prepaidAvailable,
    couriers,
  }
}

/** When user intends COD but no courier supports COD, surface as limited (prepaid may still work). */
export const applyCodIntentToServiceability = (
  base: NormalizedServiceability,
  codIntent: boolean,
): NormalizedServiceability => {
  if (base.status === "api_unavailable" || base.status === "not_deliverable") return base
  if (!codIntent || base.codAvailable) return base
  return {
    ...base,
    status: "limited_service",
  }
}
