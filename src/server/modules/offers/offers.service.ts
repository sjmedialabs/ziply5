import { Prisma } from "@prisma/client"
import { prisma } from "@/src/server/db/prisma"

type OfferType = "coupon" | "automatic" | "product_discount" | "cart_discount" | "shipping_discount" | "bogo"
type OfferStatus = "draft" | "active" | "inactive" | "expired"

type OfferTarget = {
  targetType: "product" | "category" | "user" | "segment" | "location" | "brand"
  targetId: string
}

type OfferRow = {
  id: string
  type: OfferType
  name: string
  code: string | null
  description: string | null
  status: OfferStatus
  priority: number
  stackable: boolean
  starts_at: Date | null
  ends_at: Date | null
  config_json: Prisma.JsonValue
  created_by: string | null
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
}

const ensureOffersTables = async () => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS offers_v2 (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      type text NOT NULL,
      name text NOT NULL,
      code text NULL UNIQUE,
      description text NULL,
      status text NOT NULL DEFAULT 'draft',
      priority int NOT NULL DEFAULT 100,
      stackable boolean NOT NULL DEFAULT false,
      starts_at timestamptz NULL,
      ends_at timestamptz NULL,
      config_json jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_by text NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      deleted_at timestamptz NULL
    );
  `)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS offer_targets_v2 (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      offer_id uuid NOT NULL REFERENCES offers_v2(id) ON DELETE CASCADE,
      target_type text NOT NULL,
      target_id text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS offer_usage_logs_v2 (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      offer_id uuid NOT NULL REFERENCES offers_v2(id) ON DELETE CASCADE,
      user_id text NULL,
      order_id text NULL,
      savings numeric(12,2) NOT NULL DEFAULT 0,
      status text NOT NULL DEFAULT 'applied',
      used_at timestamptz NOT NULL DEFAULT now(),
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb
    );
  `)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS order_offer_breakdown_v2 (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id text NOT NULL,
      offer_id uuid NULL REFERENCES offers_v2(id) ON DELETE SET NULL,
      offer_type text NOT NULL,
      label text NOT NULL,
      amount numeric(12,2) NOT NULL,
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `)
}

const mapOfferWithTargets = async (rows: OfferRow[]) => {
  if (rows.length === 0) return []
  const ids = rows.map((r) => r.id)
  const targets = await prisma.$queryRaw<Array<{ offer_id: string; target_type: OfferTarget["targetType"]; target_id: string }>>(
    Prisma.sql`SELECT offer_id, target_type, target_id FROM offer_targets_v2 WHERE offer_id IN (${Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`), Prisma.sql`,`)})`,
  )
  const usageRows = await prisma.$queryRaw<Array<{ offer_id: string; usage_count: bigint; total_savings: number }>>(
    Prisma.sql`
      SELECT offer_id, COUNT(*)::bigint as usage_count, COALESCE(SUM(savings), 0)::numeric as total_savings
      FROM offer_usage_logs_v2
      WHERE offer_id IN (${Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`), Prisma.sql`,`)})
      GROUP BY offer_id
    `,
  )
  return rows.map((row) => ({
    ...row,
    config: row.config_json ?? {},
    usageCount: Number(usageRows.find((usage) => usage.offer_id === row.id)?.usage_count ?? 0),
    totalSavings: Number(usageRows.find((usage) => usage.offer_id === row.id)?.total_savings ?? 0),
    targets: targets
      .filter((target) => target.offer_id === row.id)
      .map((target) => ({ targetType: target.target_type, targetId: target.target_id })),
  }))
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
  await ensureOffersTables()
  const sortBy = input?.sortBy ?? "priority"
  const sortDir = input?.sortDir === "desc" ? Prisma.sql`DESC` : Prisma.sql`ASC`
  const page = Math.max(1, input?.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, input?.pageSize ?? 20))
  const offset = (page - 1) * pageSize
  const query = input?.query?.trim()
  const orderBy =
    sortBy === "created_at" ? Prisma.sql`created_at` : sortBy === "name" ? Prisma.sql`name` : Prisma.sql`priority`
  const rows = await prisma.$queryRaw<OfferRow[]>(Prisma.sql`
    SELECT *
    FROM offers_v2
    WHERE (${input?.type ?? null}::text IS NULL OR type = ${input?.type ?? null})
      AND (${input?.status ?? null}::text IS NULL OR status = ${input?.status ?? null})
      AND (${query ?? null}::text IS NULL OR name ILIKE ${`%${query}%`} OR COALESCE(code,'') ILIKE ${`%${query}%`})
      AND (${input?.includeDeleted === true} OR deleted_at IS NULL)
    ORDER BY ${orderBy} ${sortDir}, created_at DESC
    LIMIT ${pageSize}
    OFFSET ${offset}
  `)
  const totalRows = await prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
    SELECT COUNT(*)::bigint as count
    FROM offers_v2
    WHERE (${input?.type ?? null}::text IS NULL OR type = ${input?.type ?? null})
      AND (${input?.status ?? null}::text IS NULL OR status = ${input?.status ?? null})
      AND (${query ?? null}::text IS NULL OR name ILIKE ${`%${query}%`} OR COALESCE(code,'') ILIKE ${`%${query}%`})
      AND (${input?.includeDeleted === true} OR deleted_at IS NULL)
  `)
  return {
    items: await mapOfferWithTargets(rows),
    total: Number(totalRows[0]?.count ?? 0),
    page,
    pageSize,
  }
}

export const listOfferUsageLogs = async (input: { offerId?: string; page?: number; pageSize?: number }) => {
  await ensureOffersTables()
  const page = Math.max(1, input.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 20))
  const offset = (page - 1) * pageSize
  return prisma.$queryRaw<
    Array<{ id: string; offer_id: string; user_id: string | null; order_id: string | null; savings: number; status: string; used_at: Date }>
  >(Prisma.sql`
    SELECT id, offer_id, user_id, order_id, savings, status, used_at
    FROM offer_usage_logs_v2
    WHERE (${input.offerId ?? null}::text IS NULL OR offer_id = ${input.offerId ?? null}::uuid)
    ORDER BY used_at DESC
    LIMIT ${pageSize}
    OFFSET ${offset}
  `)
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
  await ensureOffersTables()
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      INSERT INTO offers_v2 (
        type, name, code, description, status, priority, stackable, starts_at, ends_at, config_json, created_by
      ) VALUES (
        ${input.type},
        ${input.name},
        ${input.code ? input.code.trim().toUpperCase() : null},
        ${input.description ?? null},
        ${input.status ?? "draft"},
        ${input.priority ?? 100},
        ${input.stackable ?? false},
        ${input.startsAt ? new Date(input.startsAt) : null},
        ${input.endsAt ? new Date(input.endsAt) : null},
        ${input.config as Prisma.JsonObject},
        ${input.createdBy ?? null}
      ) RETURNING id
    `)
    const id = rows[0]?.id
    if (!id) throw new Error("Failed to create offer")
    for (const target of input.targets) {
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO offer_targets_v2 (offer_id, target_type, target_id)
        VALUES (${id}::uuid, ${target.targetType}, ${target.targetId})
      `)
    }
    return id
  })
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
  await ensureOffersTables()
  await prisma.$transaction(async (tx) => {
    const sets: Prisma.Sql[] = [Prisma.sql`updated_at = now()`]
    if (input.type !== undefined) sets.push(Prisma.sql`type = ${input.type}`)
    if (input.name !== undefined) sets.push(Prisma.sql`name = ${input.name}`)
    if (input.code !== undefined) sets.push(Prisma.sql`code = ${input.code ? input.code.trim().toUpperCase() : null}`)
    if (input.description !== undefined) sets.push(Prisma.sql`description = ${input.description ?? null}`)
    if (input.status !== undefined) sets.push(Prisma.sql`status = ${input.status}`)
    if (input.priority !== undefined) sets.push(Prisma.sql`priority = ${input.priority}`)
    if (input.stackable !== undefined) sets.push(Prisma.sql`stackable = ${input.stackable}`)
    if (input.startsAt !== undefined) sets.push(Prisma.sql`starts_at = ${input.startsAt ? new Date(input.startsAt) : null}`)
    if (input.endsAt !== undefined) sets.push(Prisma.sql`ends_at = ${input.endsAt ? new Date(input.endsAt) : null}`)
    if (input.config !== undefined) sets.push(Prisma.sql`config_json = ${input.config as Prisma.JsonObject}`)
    await tx.$executeRaw(Prisma.sql`
      UPDATE offers_v2
      SET ${Prisma.join(sets, Prisma.sql`, `)}
      WHERE id = ${id}::uuid
        AND deleted_at IS NULL
    `)
    if (input.targets !== undefined) {
      await tx.$executeRaw(Prisma.sql`DELETE FROM offer_targets_v2 WHERE offer_id = ${id}::uuid`)
      for (const target of input.targets) {
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO offer_targets_v2 (offer_id, target_type, target_id)
          VALUES (${id}::uuid, ${target.targetType}, ${target.targetId})
        `)
      }
    }
  })
}

export const toggleOfferStatus = async (id: string, status: OfferStatus) => {
  await ensureOffersTables()
  await prisma.$executeRaw(Prisma.sql`
    UPDATE offers_v2
    SET status = ${status}, updated_at = now()
    WHERE id = ${id}::uuid AND deleted_at IS NULL
  `)
}

export const duplicateOffer = async (id: string, actorId?: string | null) => {
  await ensureOffersTables()
  const rows = await prisma.$queryRaw<OfferRow[]>(Prisma.sql`
    SELECT * FROM offers_v2 WHERE id = ${id}::uuid AND deleted_at IS NULL LIMIT 1
  `)
  const source = rows[0]
  if (!source) throw new Error("Offer not found")
  const targetRows = await prisma.$queryRaw<Array<{ target_type: OfferTarget["targetType"]; target_id: string }>>(Prisma.sql`
    SELECT target_type, target_id FROM offer_targets_v2 WHERE offer_id = ${id}::uuid
  `)
  return createOffer({
    type: source.type,
    name: `${source.name} (Copy)`,
    code: source.code ? `${source.code}-COPY` : null,
    description: source.description,
    status: "draft",
    priority: source.priority,
    stackable: source.stackable,
    startsAt: source.starts_at?.toISOString() ?? null,
    endsAt: source.ends_at?.toISOString() ?? null,
    config: (source.config_json ?? {}) as Record<string, unknown>,
    targets: targetRows.map((target) => ({ targetType: target.target_type, targetId: target.target_id })),
    createdBy: actorId ?? null,
  })
}

export const softDeleteOffer = async (id: string) => {
  await ensureOffersTables()
  await prisma.$executeRaw(Prisma.sql`
    UPDATE offers_v2
    SET deleted_at = now(), updated_at = now(), status = 'inactive'
    WHERE id = ${id}::uuid AND deleted_at IS NULL
  `)
}

type CalcItem = {
  productId: string
  categoryId?: string | null
  quantity: number
  unitPrice: number
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

const applySimpleDiscount = (subtotal: number, cfg: Record<string, unknown>) => {
  const discountType = String(cfg.discountType ?? "percentage")
  const value = Number(cfg.discountValue ?? 0)
  const maxCap = cfg.maxDiscountCap == null ? null : Number(cfg.maxDiscountCap)
  let amount = discountType === "flat" ? value : (subtotal * value) / 100
  if (maxCap != null && Number.isFinite(maxCap)) amount = Math.min(amount, maxCap)
  return clamp(amount, 0, subtotal)
}

const filterByTargets = (items: CalcItem[], targets: OfferTarget[]) => {
  if (!targets.length) return items
  const productTargets = new Set(targets.filter((target) => target.targetType === "product").map((target) => target.targetId))
  const categoryTargets = new Set(targets.filter((target) => target.targetType === "category").map((target) => target.targetId))
  return items.filter((item) => productTargets.has(item.productId) || (item.categoryId && categoryTargets.has(item.categoryId)))
}

const calculateBogoSavings = (items: CalcItem[], cfg: Record<string, unknown>) => {
  const buyQty = Math.max(1, Number(cfg.buyQty ?? 2))
  const getQty = Math.max(1, Number(cfg.getQty ?? 1))
  const repeatable = Boolean(cfg.repeatable ?? true)
  const maxFreeUnits = cfg.maxFreeUnits == null ? Infinity : Math.max(0, Number(cfg.maxFreeUnits))
  const sorted = [...items].sort((a, b) => a.unitPrice - b.unitPrice)
  let remainingCap = maxFreeUnits
  let savings = 0
  for (const item of sorted) {
    if (remainingCap <= 0) break
    const group = buyQty + getQty
    const cycles = repeatable ? Math.floor(item.quantity / group) : item.quantity >= group ? 1 : 0
    const freeUnits = Math.min(cycles * getQty, remainingCap)
    if (freeUnits <= 0) continue
    savings += freeUnits * item.unitPrice
    remainingCap -= freeUnits
  }
  return savings
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
  await ensureOffersTables()
  const now = new Date()
  const rows = await listOffers()
  const active = rows.filter((row) => row.status === "active" && (!row.starts_at || row.starts_at <= now) && (!row.ends_at || row.ends_at >= now))
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
    const eligibleItems = filterByTargets(input.items, offer.targets)
    const amount = clamp(calculateBogoSavings(eligibleItems, offer.config), 0, runningSubtotal)
    if (applyOne(offer, amount, offer.name)) {
      runningSubtotal = clamp(runningSubtotal - amount, 0, Number.MAX_SAFE_INTEGER)
      if (!offer.stackable) break
    }
  }

  for (const offer of byType("automatic")) {
    const minCart = Number((offer.config as Record<string, unknown>).minCartValue ?? 0)
    if (runningSubtotal < minCart) continue
    const amount = applySimpleDiscount(runningSubtotal, offer.config)
    if (applyOne(offer, amount, offer.name)) {
      runningSubtotal = clamp(runningSubtotal - amount, 0, Number.MAX_SAFE_INTEGER)
      if (!offer.stackable) break
    }
  }

  for (const offer of byType("cart_discount")) {
    const minCart = Number((offer.config as Record<string, unknown>).minCartValue ?? 0)
    if (runningSubtotal < minCart) continue
    const amount = applySimpleDiscount(runningSubtotal, offer.config)
    if (applyOne(offer, amount, offer.name)) {
      runningSubtotal = clamp(runningSubtotal - amount, 0, Number.MAX_SAFE_INTEGER)
      if (!offer.stackable) break
    }
  }

  if (input.couponCode?.trim()) {
    const code = input.couponCode.trim().toUpperCase()
    const offer = byType("coupon").find((row) => row.code === code)
    if (!offer) throw new Error("Invalid code")
    const minCart = Number((offer.config as Record<string, unknown>).minCartValue ?? 0)
    if (runningSubtotal < minCart) throw new Error(`Min ₹${minCart} required`)
    const amount = applySimpleDiscount(runningSubtotal, offer.config)
    if (applyOne(offer, amount, `${offer.name} (${code})`)) {
      runningSubtotal = clamp(runningSubtotal - amount, 0, Number.MAX_SAFE_INTEGER)
    }
  }

  for (const offer of byType("shipping_discount")) {
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
  await ensureOffersTables()
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO offer_usage_logs_v2 (offer_id, user_id, order_id, savings, status, metadata)
    VALUES (
      ${input.offerId}::uuid,
      ${input.userId ?? null},
      ${input.orderId ?? null},
      ${input.savings},
      ${input.status ?? "applied"},
      ${((input.metadata ?? {}) as unknown) as Prisma.JsonObject}
    )
  `)
}

export const saveOrderOfferBreakdown = async (input: { orderId: string; rows: Array<{ offerId?: string; type: string; label: string; amount: number; metadata?: Record<string, unknown> }> }) => {
  await ensureOffersTables()
  for (const row of input.rows) {
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO order_offer_breakdown_v2 (order_id, offer_id, offer_type, label, amount, metadata)
      VALUES (
        ${input.orderId},
        ${row.offerId ?? null}::uuid,
        ${row.type},
        ${row.label},
        ${row.amount},
        ${((row.metadata ?? {}) as unknown) as Prisma.JsonObject}
      )
    `)
  }
}

