import { applySimpleDiscount, calculateBogoSavings, clamp } from "@/src/server/modules/offers/offers.math"
import { getSupabaseAdmin } from "@/src/lib/supabase/admin"
import type { PostgrestError } from "@supabase/supabase-js"

type OfferType = "coupon" | "automatic" | "product_discount" | "cart_discount" | "shipping_discount" | "bogo"
type OfferStatus = "draft" | "active" | "inactive" | "expired"

type OfferTarget = {
  targetType: "product" | "category" | "user" | "segment" | "location" | "brand"
  targetId: string
}

type OfferRowDb = {
  id: string
  type: OfferType
  name: string
  code: string | null
  description: string | null
  status: OfferStatus
  priority: number
  stackable: boolean
  starts_at: string | null
  ends_at: string | null
  config_json: Record<string, unknown> | null
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

type OfferHydrated = OfferRowDb & {
  config: Record<string, unknown>
  targets: OfferTarget[]
  usageCount?: number
  totalSavings?: number
}

const toOfferHydrated = (row: OfferRowDb): OfferHydrated => ({
  ...row,
  config: (row.config_json ?? {}) as Record<string, unknown>,
  targets: [],
})

const enrichWithTargetsAndUsage = async (rows: OfferRowDb[], opts?: { includeUsage?: boolean }) => {
  if (!rows.length) return [] as OfferHydrated[]
  const client = getSupabaseAdmin()
  const ids = rows.map((r) => r.id)

  const hydrated = rows.map(toOfferHydrated)

  const { data: targets, error: targetsError } = await client
    .from("offer_targets_v2")
    .select("offer_id,target_type,target_id")
    .in("offer_id", ids)
  if (targetsError) throw targetsError

  const targetsByOffer = new Map<string, OfferTarget[]>()
  for (const t of targets ?? []) {
    const arr = targetsByOffer.get(String((t as any).offer_id)) ?? []
    arr.push({ targetType: String((t as any).target_type) as any, targetId: String((t as any).target_id) })
    targetsByOffer.set(String((t as any).offer_id), arr)
  }

  for (const h of hydrated) {
    h.targets = targetsByOffer.get(h.id) ?? []
  }

  if (opts?.includeUsage) {
    const { data: usageRows, error: usageError } = await client
      .from("offer_usage_logs_v2")
      .select("offer_id,savings,status")
      .in("offer_id", ids)
    if (usageError) throw usageError

    const countByOffer = new Map<string, number>()
    const savingsByOffer = new Map<string, number>()
    for (const u of usageRows ?? []) {
      if (String((u as any).status ?? "") !== "applied") continue
      const offerId = String((u as any).offer_id)
      countByOffer.set(offerId, (countByOffer.get(offerId) ?? 0) + 1)
      savingsByOffer.set(offerId, (savingsByOffer.get(offerId) ?? 0) + Number((u as any).savings ?? 0))
    }
    for (const h of hydrated) {
      h.usageCount = countByOffer.get(h.id) ?? 0
      h.totalSavings = savingsByOffer.get(h.id) ?? 0
    }
  }

  return hydrated
}

export const listOffers = async (input?: {
  type?: OfferType
  includeDeleted?: boolean
  status?: OfferStatus
  query?: string
  sortBy?: "priority" | "created_at" | "name"
  sortDir?: "asc" | "desc"
  page?: number
  pageSize?: number
}) => {
  const client = getSupabaseAdmin()
  const sortBy = input?.sortBy ?? "priority"
  const ascending = input?.sortDir !== "desc"
  const page = Math.max(1, input?.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, input?.pageSize ?? 20))
  const offset = (page - 1) * pageSize
  const query = input?.query?.trim()

  let qb = client
    .from("offers_v2")
    .select("*", { count: "exact" })
    .range(offset, offset + pageSize - 1)

  if (input?.type) qb = qb.eq("type", input.type)
  if (input?.status) qb = qb.eq("status", input.status)
  if (query) {
    const escaped = query.replace(/,/g, "\\,")
    qb = qb.or(`name.ilike.%${escaped}%,code.ilike.%${escaped}%`)
  }
  if (input?.includeDeleted !== true) qb = qb.is("deleted_at", null)

  if (sortBy === "created_at") qb = qb.order("created_at", { ascending }).order("created_at", { ascending: false })
  else if (sortBy === "name") qb = qb.order("name", { ascending }).order("created_at", { ascending: false })
  else qb = qb.order("priority", { ascending }).order("created_at", { ascending: false })

  const { data: rows, error, count } = await qb
  if (error) throw error

  return {
    items: await enrichWithTargetsAndUsage((rows ?? []) as OfferRowDb[], { includeUsage: true }),
    total: Number(count ?? 0),
    page,
    pageSize,
  }
}

export const listOfferUsageLogs = async (input: { offerId?: string; page?: number; pageSize?: number }) => {
  const client = getSupabaseAdmin()
  const page = Math.max(1, input.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 20))
  const offset = (page - 1) * pageSize
  let qb = client
    .from("offer_usage_logs_v2")
    .select("id,offer_id,user_id,order_id,savings,status,used_at")
    .order("used_at", { ascending: false })
    .range(offset, offset + pageSize - 1)
  if (input.offerId) qb = qb.eq("offer_id", input.offerId)
  const { data, error } = await qb
  if (error) throw error
  return (data ?? []) as Array<{ id: string; offer_id: string; user_id: string | null; order_id: string | null; savings: number; status: string; used_at: string }>
}

export const createOffer = async (input: {
  type: OfferType
  name: string
  code?: string | null
  description?: string | null
  status?: OfferStatus
  priority?: number
  stackable?: boolean
  startsAt?: string | null
  endsAt?: string | null
  config: Record<string, unknown>
  targets: OfferTarget[]
  createdBy?: string | null
}) => {
  const client = getSupabaseAdmin()
  const payload = {
    type: input.type,
    name: input.name,
    code: input.code ? input.code.trim().toUpperCase() : null,
    description: input.description ?? null,
    status: input.status ?? "draft",
    priority: input.priority ?? 100,
    stackable: input.stackable ?? false,
    starts_at: input.startsAt ? new Date(input.startsAt).toISOString() : null,
    ends_at: input.endsAt ? new Date(input.endsAt).toISOString() : null,
    config_json: input.config ?? {},
    created_by: input.createdBy ?? null,
  }
  const { data, error } = await client.from("offers_v2").insert(payload).select("id").single()
  if (error) throw error
  const id = String((data as any)?.id ?? "")
  if (!id) throw new Error("Failed to create offer")
  if (input.targets?.length) {
    const { error: targetsError } = await client.from("offer_targets_v2").insert(
      input.targets.map((t) => ({
        offer_id: id,
        target_type: t.targetType,
        target_id: t.targetId,
      })),
    )
    if (targetsError) throw targetsError
  }
  return id
}

export const updateOffer = async (
  id: string,
  input: Partial<{
    type: OfferType
    name: string
    code: string | null
    description: string | null
    status: OfferStatus
    priority: number
    stackable: boolean
    startsAt: string | null
    endsAt: string | null
    config: Record<string, unknown>
    targets: OfferTarget[]
  }>,
) => {
  const client = getSupabaseAdmin()
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.type !== undefined) patch.type = input.type
  if (input.name !== undefined) patch.name = input.name
  if (input.code !== undefined) patch.code = input.code ? input.code.trim().toUpperCase() : null
  if (input.description !== undefined) patch.description = input.description ?? null
  if (input.status !== undefined) patch.status = input.status
  if (input.priority !== undefined) patch.priority = input.priority
  if (input.stackable !== undefined) patch.stackable = input.stackable
  if (input.startsAt !== undefined) patch.starts_at = input.startsAt ? new Date(input.startsAt).toISOString() : null
  if (input.endsAt !== undefined) patch.ends_at = input.endsAt ? new Date(input.endsAt).toISOString() : null
  if (input.config !== undefined) patch.config_json = input.config ?? {}

  const { error } = await client.from("offers_v2").update(patch).eq("id", id).is("deleted_at", null)
  if (error) throw error

  if (input.targets !== undefined) {
    const { error: delErr } = await client.from("offer_targets_v2").delete().eq("offer_id", id)
    if (delErr) throw delErr
    if (input.targets.length) {
      const { error: insErr } = await client.from("offer_targets_v2").insert(
        input.targets.map((t) => ({ offer_id: id, target_type: t.targetType, target_id: t.targetId })),
      )
      if (insErr) throw insErr
    }
  }
}

export const toggleOfferStatus = async (id: string, status: OfferStatus) => {
  const client = getSupabaseAdmin()
  const { error } = await client
    .from("offers_v2")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
  if (error) throw error
}

export const duplicateOffer = async (id: string, actorId?: string | null) => {
  const client = getSupabaseAdmin()
  const { data: source, error } = await client.from("offers_v2").select("*").eq("id", id).is("deleted_at", null).single()
  if (error) throw error
  if (!source) throw new Error("Offer not found")
  const { data: targetRows, error: targetsError } = await client.from("offer_targets_v2").select("target_type,target_id").eq("offer_id", id)
  if (targetsError) throw targetsError
  return createOffer({
    type: (source as any).type,
    name: `${String((source as any).name)} (Copy)`,
    code: (source as any).code ? `${String((source as any).code)}-COPY` : null,
    description: (source as any).description ?? null,
    status: "draft",
    priority: Number((source as any).priority ?? 100),
    stackable: Boolean((source as any).stackable ?? false),
    startsAt: (source as any).starts_at ?? null,
    endsAt: (source as any).ends_at ?? null,
    config: ((source as any).config_json ?? {}) as Record<string, unknown>,
    targets: (targetRows ?? []).map((target: any) => ({ targetType: String(target.target_type) as any, targetId: String(target.target_id) })),
    createdBy: actorId ?? null,
  })
}

export const softDeleteOffer = async (id: string) => {
  const client = getSupabaseAdmin()
  const now = new Date().toISOString()
  const { error } = await client
    .from("offers_v2")
    .update({ deleted_at: now, updated_at: now, status: "inactive" })
    .eq("id", id)
    .is("deleted_at", null)
  if (error) throw error
}

type CalcItem = {
  productId: string
  categoryId?: string | null
  quantity: number
  unitPrice: number
}

const filterByTargets = (items: CalcItem[], targets: OfferTarget[]) => {
  if (!targets.length) return items
  const productTargets = new Set(targets.filter((target) => target.targetType === "product").map((target) => target.targetId))
  const categoryTargets = new Set(targets.filter((target) => target.targetType === "category").map((target) => target.targetId))
  return items.filter((item) => productTargets.has(item.productId) || (item.categoryId && categoryTargets.has(item.categoryId)))
}


export const calculateOffers = async (input: {
  userId?: string | null
  couponCode?: string | null
  items: CalcItem[]
  shippingAmount: number
  cartSubtotal: number
  context?: {
    paymentMethod?: string | null
    location?: string | null
    firstOrder?: boolean
  }
}) => {
  const now = new Date()
  // Fetch active offers (Supabase) and filter date windows in-process (safe + consistent).
  const client = getSupabaseAdmin()
  const { data: offerRows, error } = await client
    .from("offers_v2")
    .select("*")
    .eq("status", "active")
    .is("deleted_at", null)
  if (error) throw error
  const hydrated = await enrichWithTargetsAndUsage((offerRows ?? []) as OfferRowDb[])
  const active = hydrated.filter((row) => {
    const starts = row.starts_at ? new Date(row.starts_at) : null
    const ends = row.ends_at ? new Date(row.ends_at) : null
    return (!starts || starts <= now) && (!ends || ends >= now)
  })
  const byType = (type: OfferType) => active.filter((offer) => offer.type === type).sort((a, b) => a.priority - b.priority)

  const breakdown: Array<{ offerId: string; type: OfferType; label: string; amount: number; stackable: boolean }> = []
  let runningSubtotal = input.cartSubtotal
  let runningShipping = input.shippingAmount

  const applyOne = (offer: any, amount: number, label: string) => {
    if (amount <= 0) return false
    const clamped = clamp(amount, 0, runningSubtotal + runningShipping)
    breakdown.push({ offerId: offer.id, type: offer.type, label, amount: clamped, stackable: Boolean(offer.stackable) })
    return true
  }

  const usageCache = new Map<string, { usedTotal: number; usedByUser?: number }>()
  const getUsage = async (offerId: string) => {
    const cached = usageCache.get(offerId)
    if (cached) return cached
    const client = getSupabaseAdmin()
    const { count: usedTotal, error: totalErr } = await client
      .from("offer_usage_logs_v2")
      .select("id", { count: "exact", head: true })
      .eq("offer_id", offerId)
      .eq("status", "applied")
    if (totalErr) throw totalErr
    let usedByUser: number | undefined = undefined
    if (input.userId) {
      const { count: byUser, error: userErr } = await client
        .from("offer_usage_logs_v2")
        .select("id", { count: "exact", head: true })
        .eq("offer_id", offerId)
        .eq("status", "applied")
        .eq("user_id", input.userId)
      if (userErr) throw userErr
      usedByUser = Number(byUser ?? 0)
    }
    const value = { usedTotal: Number(usedTotal ?? 0), usedByUser }
    usageCache.set(offerId, value)
    return value
  }

  const isEligibleByLimits = async (offer: any) => {
    const cfg = (offer.config ?? {}) as Record<string, unknown>
    const firstOrderOnly = Boolean(cfg.firstOrderOnly ?? false)
    if (firstOrderOnly && !input.context?.firstOrder) return false
    const usageLimitTotal = cfg.usageLimitTotal == null ? null : Number(cfg.usageLimitTotal)
    const usageLimitPerUser = cfg.usageLimitPerUser == null ? null : Number(cfg.usageLimitPerUser)
    if (usageLimitTotal == null && usageLimitPerUser == null) return true
    const usage = await getUsage(offer.id)
    if (usageLimitTotal != null && Number.isFinite(usageLimitTotal) && usage.usedTotal >= usageLimitTotal) return false
    if (input.userId && usageLimitPerUser != null && Number.isFinite(usageLimitPerUser) && (usage.usedByUser ?? 0) >= usageLimitPerUser) return false
    return true
  }

  for (const offer of byType("product_discount")) {
    const eligibleItems = filterByTargets(input.items, offer.targets)
    const subtotal = eligibleItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    const amount = applySimpleDiscount(subtotal, offer.config)
    if (applyOne(offer, amount, offer.name)) {
      runningSubtotal = clamp(runningSubtotal - amount, 0, Number.MAX_SAFE_INTEGER)
      if (!offer.stackable) break
    }
  }

  for (const offer of byType("bogo")) {
    if (!(await isEligibleByLimits(offer))) continue
    const eligibleItems = filterByTargets(input.items, offer.targets)
    const amount = clamp(calculateBogoSavings(eligibleItems, offer.config), 0, runningSubtotal)
    if (applyOne(offer, amount, offer.name)) {
      runningSubtotal = clamp(runningSubtotal - amount, 0, Number.MAX_SAFE_INTEGER)
      if (!offer.stackable) break
    }
  }

  for (const offer of byType("cart_discount")) {
    if (!(await isEligibleByLimits(offer))) continue
    const minCart = Number((offer.config as Record<string, unknown>).minCartValue ?? 0)
    if (runningSubtotal < minCart) continue
    const amount = applySimpleDiscount(runningSubtotal, offer.config)
    if (applyOne(offer, amount, offer.name)) {
      runningSubtotal = clamp(runningSubtotal - amount, 0, Number.MAX_SAFE_INTEGER)
      if (!offer.stackable) break
    }
  }

  // Automatic offers: apply only the best one unless stacking is explicitly enabled.
  {
    const autos = byType("automatic")
    const stackableAutos = autos.filter((o) => Boolean(o.stackable))
    const nonStackableAutos = autos.filter((o) => !Boolean(o.stackable))
    for (const offer of stackableAutos) {
      if (!(await isEligibleByLimits(offer))) continue
      const minCart = Number((offer.config as Record<string, unknown>).minCartValue ?? 0)
      if (runningSubtotal < minCart) continue
      const amount = applySimpleDiscount(runningSubtotal, offer.config)
      if (applyOne(offer, amount, offer.name)) {
        runningSubtotal = clamp(runningSubtotal - amount, 0, Number.MAX_SAFE_INTEGER)
      }
    }
    if (nonStackableAutos.length) {
      let best: { offer: any; amount: number } | null = null
      for (const offer of nonStackableAutos) {
        if (!(await isEligibleByLimits(offer))) continue
        const minCart = Number((offer.config as Record<string, unknown>).minCartValue ?? 0)
        if (runningSubtotal < minCart) continue
        const amount = applySimpleDiscount(runningSubtotal, offer.config)
        if (!best || amount > best.amount || (amount === best.amount && offer.priority < best.offer.priority)) {
          best = { offer, amount }
        }
      }
      if (best && best.amount > 0) {
        if (applyOne(best.offer, best.amount, best.offer.name)) {
          runningSubtotal = clamp(runningSubtotal - best.amount, 0, Number.MAX_SAFE_INTEGER)
        }
      }
    }
  }

  if (input.couponCode?.trim()) {
    const code = input.couponCode.trim().toUpperCase()
    const offer = byType("coupon").find((row) => row.code === code)
    if (!offer) throw new Error("Invalid code")
    if (!(await isEligibleByLimits(offer))) throw new Error("Coupon not eligible")
    const minCart = Number((offer.config as Record<string, unknown>).minCartValue ?? 0)
    if (runningSubtotal < minCart) throw new Error(`Min ₹${minCart} required`)
    const amount = applySimpleDiscount(runningSubtotal, offer.config)
    if (applyOne(offer, amount, `${offer.name} (${code})`)) {
      runningSubtotal = clamp(runningSubtotal - amount, 0, Number.MAX_SAFE_INTEGER)
    }
  }

  for (const offer of byType("shipping_discount")) {
    if (!(await isEligibleByLimits(offer))) continue
    const minCart = Number((offer.config as Record<string, unknown>).minCartValue ?? 0)
    if (runningSubtotal < minCart) continue
    const cfg = offer.config as Record<string, unknown>
    const mode = String(cfg.mode ?? "flat")
    const amount =
      mode === "free"
        ? runningShipping
        : mode === "percentage"
          ? clamp((runningShipping * Number(cfg.discountValue ?? 0)) / 100, 0, runningShipping)
          : clamp(Number(cfg.discountValue ?? 0), 0, runningShipping)
    if (applyOne(offer, amount, offer.name)) {
      runningShipping = clamp(runningShipping - amount, 0, Number.MAX_SAFE_INTEGER)
      if (!offer.stackable) break
    }
  }

  const totalDiscount = breakdown.reduce((sum, row) => sum + row.amount, 0)
  const finalTotal = clamp(runningSubtotal + runningShipping, 0, Number.MAX_SAFE_INTEGER)

  return {
    subtotal: input.cartSubtotal,
    shipping: input.shippingAmount,
    adjustedSubtotal: runningSubtotal,
    adjustedShipping: runningShipping,
    totalDiscount,
    finalTotal,
    breakdown,
  }
}

export const logOfferUsage = async (input: { offerId: string; userId?: string | null; orderId?: string | null; savings: number; status?: string; metadata?: Record<string, unknown> }) => {
  const client = getSupabaseAdmin()
  const { error } = await client.from("offer_usage_logs_v2").insert({
    offer_id: input.offerId,
    user_id: input.userId ?? null,
    order_id: input.orderId ?? null,
    savings: input.savings,
    status: input.status ?? "applied",
    metadata: input.metadata ?? {},
  })
  if (error) throw error
}

export const saveOrderOfferBreakdown = async (input: { orderId: string; rows: Array<{ offerId?: string; type: string; label: string; amount: number; metadata?: Record<string, unknown> }> }) => {
  const client = getSupabaseAdmin()
  if (!input.rows.length) return
  const { error } = await client.from("order_offer_breakdown_v2").insert(
    input.rows.map((row) => ({
      order_id: input.orderId,
      offer_id: row.offerId ?? null,
      offer_type: row.type,
      label: row.label,
      amount: row.amount,
      metadata: row.metadata ?? {},
    })),
  )
  if (error) throw error
}

