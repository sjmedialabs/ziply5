import {
  SHIPROCKET_SERVICEABILITY_PLACEHOLDER_DECLARED_VALUE_INR,
  SHIPROCKET_SERVICEABILITY_PLACEHOLDER_WEIGHT_KG,
  ZIPLY5_PACKS_FREE_SHIPPING_ABOVE,
  ZIPLY5_SHIPPING_MIN_PACKS,
  ZIPLY5_SHIPPING_SLABS,
  type Ziply5ShippingSlab,
} from "@/src/lib/shipping/ziply5-shipping.constants"

export type Ziply5ShippingBreakdown = {
  totalPacks: number
  chargeInr: number
  slab: Ziply5ShippingSlab | null
  /**
   * Kept for API backward compatibility; always false (no “charge highest slab” fallback).
   * Large orders use {@link freeLargeOrderShipping} instead.
   */
  usedHighestSlabFallback: boolean
  /** True when pack count is above {@link ZIPLY5_PACKS_FREE_SHIPPING_ABOVE} — shipping is ₹0. */
  freeLargeOrderShipping: boolean
}

export const matchZiply5ShippingSlab = (
  totalPacks: number,
): { slab: Ziply5ShippingSlab | null } => {
  const n = Math.floor(Number(totalPacks))
  if (!Number.isFinite(n) || n < ZIPLY5_SHIPPING_MIN_PACKS) {
    return { slab: null }
  }
  if (n > ZIPLY5_PACKS_FREE_SHIPPING_ABOVE) {
    return { slab: null }
  }
  for (const slab of ZIPLY5_SHIPPING_SLABS) {
    if (n >= slab.minQty && n <= slab.maxQty) {
      return { slab }
    }
  }
  return { slab: null }
}

/** @alias calculateZiply5Shipping — centralized Ziply5 slab shipping (COD and prepaid). */
export const calculateZiply5Shipping = (totalPacks: number): Ziply5ShippingBreakdown => {
  const n = Math.floor(Number(totalPacks))
  if (!Number.isFinite(n) || n < ZIPLY5_SHIPPING_MIN_PACKS) {
    return {
      totalPacks: Math.max(0, n),
      chargeInr: 0,
      slab: null,
      usedHighestSlabFallback: false,
      freeLargeOrderShipping: false,
    }
  }
  const freeLargeOrderShipping = n > ZIPLY5_PACKS_FREE_SHIPPING_ABOVE
  const { slab } = matchZiply5ShippingSlab(n)
  const chargeInr = freeLargeOrderShipping ? 0 : slab?.chargeInr ?? 0
  return {
    totalPacks: n,
    chargeInr,
    slab: freeLargeOrderShipping ? null : slab,
    usedHighestSlabFallback: false,
    freeLargeOrderShipping,
  }
}

export const totalPacksFromCheckoutLines = (
  items: Array<{ quantity: number }>,
): number => {
  let sum = 0
  for (const line of items) {
    const q = Math.floor(Number(line.quantity))
    if (!Number.isFinite(q) || q < 1) continue
    sum += q
  }
  return sum
}

const MONEY_EPS = 0.02

/** Ensures customer is never charged above the Ziply5 slab cap; allows free/discounted shipping from offers. */
export const assertZiply5ShippingWithinSlabCap = (
  claimedShipping: number,
  totalPacks: number,
): { ok: true; slabCapInr: number } | { ok: false; slabCapInr: number; message: string } => {
  const { chargeInr: cap } = calculateZiply5Shipping(totalPacks)
  const claimed = Number(claimedShipping)
  if (!Number.isFinite(claimed) || claimed < 0) {
    return { ok: false, slabCapInr: cap, message: "Invalid shipping charge." }
  }
  if (claimed > cap + MONEY_EPS) {
    return {
      ok: false,
      slabCapInr: cap,
      message: "Shipping charge exceeds allowed Ziply5 pricing. Please refresh checkout.",
    }
  }
  return { ok: true, slabCapInr: cap }
}

/** Strict equality against slab (e.g. regression tests, admin tools). */
export const assertZiply5ShippingMatchesSlab = (
  claimedShipping: number,
  totalPacks: number,
): { ok: true; expected: number } | { ok: false; expected: number; message: string } => {
  const { chargeInr } = calculateZiply5Shipping(totalPacks)
  const claimed = Number(claimedShipping)
  if (!Number.isFinite(claimed) || claimed < 0) {
    return { ok: false, expected: chargeInr, message: "Invalid shipping charge." }
  }
  if (Math.abs(claimed - chargeInr) > MONEY_EPS) {
    return {
      ok: false,
      expected: chargeInr,
      message: "Shipping charge does not match server pricing. Please refresh checkout.",
    }
  }
  return { ok: true, expected: chargeInr }
}

export const shiprocketServiceabilityPayload = (input: {
  pickupPostcode: string
  deliveryPostcode: string
  cod: 0 | 1
}) => ({
  pickup_postcode: input.pickupPostcode,
  delivery_postcode: input.deliveryPostcode,
  cod: input.cod,
  weight: SHIPROCKET_SERVICEABILITY_PLACEHOLDER_WEIGHT_KG,
  declared_value: SHIPROCKET_SERVICEABILITY_PLACEHOLDER_DECLARED_VALUE_INR,
})
