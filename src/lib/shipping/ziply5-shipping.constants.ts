/**
 * Ziply5 flat shipping by total pack quantity (sum of cart line quantities).
 * Courier / Shiprocket rates must never override these slabs.
 */

export type Ziply5ShippingSlab = {
  minQty: number
  maxQty: number
  chargeInr: number
  label: string
}

/** Ordered slabs; extend by appending rows. Above {@link ZIPLY5_PACKS_FREE_SHIPPING_ABOVE} packs, shipping is free. */
export const ZIPLY5_SHIPPING_SLABS: readonly Ziply5ShippingSlab[] = [
  { minQty: 1, maxQty: 3, chargeInr: 125, label: "1–3 packs" },
  { minQty: 4, maxQty: 6, chargeInr: 250, label: "4–6 packs" },
  { minQty: 7, maxQty: 18, chargeInr: 450, label: "7–18 packs" },
  { minQty: 19, maxQty: 30, chargeInr: 550, label: "19–30 packs" },
] as const

/** Minimum declared packs for pricing (empty cart = zero shipping). */
export const ZIPLY5_SHIPPING_MIN_PACKS = 1

/** Pack counts **strictly greater** than this value get free shipping (31+ packs). */
export const ZIPLY5_PACKS_FREE_SHIPPING_ABOVE = 30

/**
 * Shiprocket serviceability API requires weight; it must not be used for Ziply5 pricing.
 * Fixed minimal placeholder only to satisfy the external API.
 */
export const SHIPROCKET_SERVICEABILITY_PLACEHOLDER_WEIGHT_KG = 0.5

/** Nominal order value for serviceability checks (not used for Ziply5 shipping). */
export const SHIPROCKET_SERVICEABILITY_PLACEHOLDER_DECLARED_VALUE_INR = 100
