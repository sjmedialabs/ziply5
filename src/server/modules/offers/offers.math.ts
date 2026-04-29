export const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

export const applySimpleDiscount = (subtotal: number, cfg: Record<string, unknown>) => {
  const discountType = String(cfg.discountType ?? "percentage")
  const value = Number(cfg.discountValue ?? 0)
  const maxCap = cfg.maxDiscountCap == null ? null : Number(cfg.maxDiscountCap)
  let amount = discountType === "flat" ? value : (subtotal * value) / 100
  if (maxCap != null && Number.isFinite(maxCap)) amount = Math.min(amount, maxCap)
  return clamp(amount, 0, subtotal)
}

export type BogoConfig = {
  buyQty?: number
  getQty?: number
  repeatable?: boolean
  maxFreeUnits?: number | null
  rewardType?: "free" | "percentage_off" | string
  rewardValue?: number
}

export type BogoItem = { quantity: number; unitPrice: number }

export const calculateBogoSavings = (items: BogoItem[], cfg: BogoConfig) => {
  const buyQty = Math.max(1, Number(cfg.buyQty ?? 2))
  const getQty = Math.max(1, Number(cfg.getQty ?? 1))
  const repeatable = Boolean(cfg.repeatable ?? true)
  const maxFreeUnits = cfg.maxFreeUnits == null ? Infinity : Math.max(0, Number(cfg.maxFreeUnits))
  const rewardType = String(cfg.rewardType ?? "free")
  const rewardValue = Number(cfg.rewardValue ?? 0)

  const sorted = [...items].sort((a, b) => a.unitPrice - b.unitPrice)
  let remainingCap = maxFreeUnits
  let savings = 0
  for (const item of sorted) {
    if (remainingCap <= 0) break
    const group = buyQty + getQty
    const cycles = repeatable ? Math.floor(item.quantity / group) : item.quantity >= group ? 1 : 0
    const freeUnits = Math.min(cycles * getQty, remainingCap)
    if (freeUnits <= 0) continue
    if (rewardType === "percentage_off") {
      savings += freeUnits * item.unitPrice * clamp(rewardValue / 100, 0, 1)
    } else {
      savings += freeUnits * item.unitPrice
    }
    remainingCap -= freeUnits
  }
  return savings
}

