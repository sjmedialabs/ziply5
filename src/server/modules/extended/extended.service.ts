import { getSupabaseAdmin } from "@/src/lib/supabase/admin"
import { createBrandSupabase, listBrandsSupabase } from "@/src/lib/db/brands"
import {
  createUserAddressSupabase,
  deleteUserAddressSupabase,
  listUserAddressesSupabase,
  updateUserAddressSupabase,
} from "@/src/lib/db/users"
import { createReturnRequestSupabase } from "@/src/lib/db/returns"
import { logger } from "@/lib/logger"

const supabase = () => getSupabaseAdmin()
const normalizeSlug = (slug: string) => slug.trim().toLowerCase().replace(/\s+/g, "-")

export const listBrands = async () => {
  return listBrandsSupabase()
}

export const createBrand = (name: string, slug: string) =>
  createBrandSupabase({ name, slug })

export const listTags = async () => {
  const { data, error } = await supabase().from("Tag").select("*").order("name", { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

export const createTag = (name: string, slug: string) =>
  supabase()
    .from("Tag")
    .insert({ name, slug: normalizeSlug(slug) })
    .select("*")
    .single()
    .then(({ data, error }) => {
      if (error) throw new Error(error.message)
      return data
    })

export const updateTag = async (id: string, name: string, slug: string, isActive: boolean) => {
  const { data, error } = await supabase()
    .from("Tag")
    .update({
      ...(name !== undefined ? { name } : {}),
      ...(slug !== undefined ? { slug: normalizeSlug(slug) } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    })
    .eq("id", id)
    .select("*")
    .single()
  if (error) throw new Error(error.message)
  return data
}

export const listAttributeDefs = async () => {
  const { data, error } = await supabase().from("AttributeDef").select("*").order("name", { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

export const createAttributeDef = (name: string, slug: string) =>
  supabase()
    .from("AttributeDef")
    .insert({ name, slug: normalizeSlug(slug) })
    .select("*")
    .single()
    .then(({ data, error }) => {
      if (error) throw new Error(error.message)
      return data
    })

export type InventoryRow =
  | {
    id: string
    productId: string
    warehouse: string | null
    available: number
    reserved: number
    source: "warehouse"
    product: { name: string; slug: string }
  }
  | {
    id: string
    productId: string
    warehouse: null
    available: number
    reserved: number
    source: "variant"
    variantName: string
    product: { name: string; slug: string }
  }

export const listInventoryOverview = async (): Promise<InventoryRow[]> => {
  const { data: rows, error: rowsError } = await supabase()
    .from("InventoryItem")
    .select("id,productId,warehouse,available,reserved,product:Product(name,slug)")
    .order("available", { ascending: true })
    .limit(200)
  if (rowsError) throw new Error(rowsError.message)
  const fromWarehouse: InventoryRow[] = rows.map((r) => ({
    id: (r as any).id,
    productId: (r as any).productId,
    warehouse: (r as any).warehouse,
    available: Number((r as any).available ?? 0),
    reserved: Number((r as any).reserved ?? 0),
    source: "warehouse" as const,
    product: ((r as any).product?.[0] ?? (r as any).product ?? { name: "", slug: "" }) as any,
  }))
  const { data: variants, error: variantsError } = await supabase()
    .from("ProductVariant")
    .select("id,productId,name,stock,product:Product(name,slug)")
    .order("stock", { ascending: true })
    .limit(200)
  if (variantsError) throw new Error(variantsError.message)
  const fromVariant: InventoryRow[] = variants.map((v) => ({
    id: (v as any).id,
    productId: (v as any).productId,
    warehouse: null,
    available: Number((v as any).stock ?? 0),
    reserved: 0,
    source: "variant" as const,
    variantName: (v as any).name,
    product: ((v as any).product?.[0] ?? (v as any).product ?? { name: "", slug: "" }) as any,
  }))
  if (fromWarehouse.length > 0) return fromWarehouse
  return fromVariant
}

export const updateInventoryItem = async (id: string, available: number, reserved?: number) => {
  const { data, error } = await supabase()
    .from("InventoryItem")
    .update({ available, ...(reserved !== undefined ? { reserved } : {}) })
    .eq("id", id)
    .select("id,productId,warehouse,available,reserved,product:Product(name,slug)")
    .single()
  if (error) throw new Error(error.message)
  return data
}

export const updateVariantStock = async (id: string, stock: number) => {
  const { data, error } = await supabase()
    .from("ProductVariant")
    .update({ stock })
    .eq("id", id)
    .select("id,productId,name,stock,product:Product(name,slug)")
    .single()
  if (error) throw new Error(error.message)
  return data
}

export const listReviews = (filters?: { status?: string; productId?: string; orderId?: string; userId?: string }) =>
  (async () => {
    let query = supabase()
      .from("ProductReview")
      .select("*,product:Product(name,slug),user:User(email,name)")
      .order("createdAt", { ascending: false })
      .limit(200)
    if (filters?.status) query = query.eq("status", filters.status)
    if (filters?.productId) query = query.eq("productId", filters.productId)
    if (filters?.orderId) query = query.eq("orderId", filters.orderId)
    if (filters?.userId) query = query.eq("userId", filters.userId)
    const { data, error } = await query
    if (error) throw new Error(error.message)
    return data ?? []
  })()

export const updateReviewStatus = (id: string, status: string) =>
  supabase().from("ProductReview").update({ status }).eq("id", id).select("*").single().then(({ data, error }) => {
    if (error) throw new Error(error.message)
    return data
  })

export const createReview = async (input: {
  productId: string
  orderId?: string | null
  userId?: string | null
  guestName?: string | null
  guestEmail?: string | null
  rating: number
  title?: string
  body?: string
  status?: string
}) => {
  if (input.userId && input.orderId) {
    const { data: existing, error: existingError } = await supabase()
      .from("ProductReview")
      .select("id")
      .eq("productId", input.productId)
      .eq("orderId", input.orderId)
      .eq("userId", input.userId)
      .limit(1)
      .maybeSingle()
    if (existingError) throw new Error(existingError.message)
    if (existing?.id) throw new Error("Already reviewed")
  }
  const { data, error } = await supabase()
    .from("ProductReview")
    .insert({
      productId: input.productId,
      orderId: input.orderId ?? null,
      userId: input.userId ?? null,
      guestName: input.guestName ?? null,
      guestEmail: input.guestEmail ?? null,
      rating: input.rating,
      title: input.title ?? null,
      body: input.body ?? null,
      status: input.status ?? "published",
    })
    .select("*")
    .single()
  if (error) throw new Error(error.message)
  return data
}

export const listReturnRequests = () =>
  supabase()
    .from("ReturnRequest")
    .select(`
      *,
      order:Order(
        id,
        total,
        status,
        userId,
        refunds:RefundRecord(
          id,
          amount,
          status,
          createdAt
        )
      ),
      pickup:ReturnPickup(*)
    `)
    .order("createdAt", { ascending: false })
    .limit(200)
    .then(({ data, error }) => {
      if (error) throw new Error(error.message)
      return data ?? []
    })

export const updateReturnStatus = (id: string, status: string) =>
  supabase().from("ReturnRequest").update({ status }).eq("id", id).select("*").single().then(({ data, error }) => {
    if (error) throw new Error(error.message)
    return data
  })

export const createReturnRequest = async (
  orderId: string,
  userId: string | null,
  reason?: string,
  items?: Array<{ orderItemId: string; productId: string; requestedQty: number; reasonCode?: string; notes?: string; imageUrl?: string }>
) => {
  try {
    return await createReturnRequestSupabase(orderId, userId, reason, items)
  } catch (error) {
    logger.error("returns.create.supabase_failed", {
      error: error instanceof Error ? error.message : "unknown",
      orderId
    })
    throw error
  }
}

export const listAbandonedCarts = () =>
  supabase()
    .from("AbandonedCart")
    .select("*")
    .order("updatedAt", { ascending: false })
    .limit(100)
    .then(({ data, error }) => {
      if (error) throw new Error(error.message)
      return data ?? []
    })

export const upsertAbandonedCart = async (input: {
  sessionKey: string
  email?: string | null
  itemsJson: unknown
  total?: number | null
}) => {
  const { data: existing, error: existingError } = await supabase()
    .from("AbandonedCart")
    .select("id")
    .eq("sessionKey", input.sessionKey)
    .maybeSingle()
  if (existingError) throw new Error(existingError.message)
  if (existing?.id) {
    const { data, error } = await supabase()
      .from("AbandonedCart")
      .update({
        email: input.email ?? null,
        itemsJson: input.itemsJson as any,
        total: input.total ?? null,
      })
      .eq("id", existing.id)
      .select("*")
      .single()
    if (error) throw new Error(error.message)
    return data
  }
  const { data, error } = await supabase()
    .from("AbandonedCart")
    .insert({
      sessionKey: input.sessionKey,
      email: input.email ?? null,
      itemsJson: input.itemsJson as any,
      total: input.total ?? null,
    })
    .select("*")
    .single()
  if (error) throw new Error(error.message)
  return data
}

export const listPromotions = () =>
  supabase()
    .from("Promotion")
    .select("*,products:PromotionProduct(*,product:Product(*)),variants:PromotionVariant(*,variant:ProductVariant(*))")
    .order("updatedAt", { ascending: false })
    .limit(100)
    .then(({ data, error }) => {
      if (error) throw new Error(error.message)
      return data ?? []
    })

export const createPromotion = async (input: {
  kind: string
  name: string
  active?: boolean
  startsAt?: Date | null
  endsAt?: Date | null

  products?: Array<{
    productId: string
    discountPercent?: number

    variants?: Array<{
      variantId: string
      discountPercent: number
    }>
  }>

  metadata?: unknown
}) => {
  const { data: promotion, error } = await supabase()
    .from("Promotion")
    .insert({
      kind: input.kind,
      name: input.name,
      active: input.active ?? true,
      startsAt: input.startsAt ?? null,
      endsAt: input.endsAt ?? null,
      metadata: {
        products:
          input.products?.map((p) => ({
            productId: p.productId,
            discountPercent: p.discountPercent ?? null,
          })) ?? [],
      },
    })
    .select("*")
    .single()
  if (error) throw new Error(error.message)
  if (input.products?.length) {
    const { error: ppError } = await supabase().from("PromotionProduct").insert(
      input.products.map((p) => ({ promotionId: promotion.id, productId: p.productId })),
    )
    if (ppError) throw new Error(ppError.message)
    const variantRows = input.products.flatMap((p) =>
      (p.variants ?? []).map((v) => ({
        promotionId: promotion.id,
        variantId: v.variantId,
        metadata: { discountPercent: v.discountPercent },
      })),
    )
    if (variantRows.length) {
      const { error: pvError } = await supabase().from("PromotionVariant").insert(variantRows)
      if (pvError) throw new Error(pvError.message)
    }
  }
  return promotion

}

export const updatePromotion = async (
  id: string,
  input: Partial<{
    kind: string
    name: string
    active: boolean
    startsAt: Date | null
    endsAt: Date | null

    products: Array<{
      productId: string
      discountPercent?: number

      variants?: Array<{
        variantId: string
        discountPercent: number
      }>
    }>

    metadata: unknown
  }>
) => {
  const { data: updated, error } = await supabase()
    .from("Promotion")
    .update({
      ...(input.kind !== undefined ? { kind: input.kind } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
      ...(input.startsAt !== undefined ? { startsAt: input.startsAt } : {}),
      ...(input.endsAt !== undefined ? { endsAt: input.endsAt } : {}),
      ...(input.products
        ? {
          metadata: {
            products: input.products.map((p) => ({
              productId: p.productId,
              discountPercent: p.discountPercent ?? null,
            })),
          },
        }
        : input.metadata === undefined
          ? {}
          : { metadata: input.metadata as any }),
    })
    .eq("id", id)
    .select("*")
    .single()
  if (error) throw new Error(error.message)
  if (input.products) {
    const { error: delPpError } = await supabase().from("PromotionProduct").delete().eq("promotionId", id)
    if (delPpError) throw new Error(delPpError.message)
    const { error: delPvError } = await supabase().from("PromotionVariant").delete().eq("promotionId", id)
    if (delPvError) throw new Error(delPvError.message)
    if (input.products.length) {
      const { error: ppError } = await supabase().from("PromotionProduct").insert(
        input.products.map((p) => ({ promotionId: id, productId: p.productId })),
      )
      if (ppError) throw new Error(ppError.message)
      const variantRows = input.products.flatMap((p) =>
        (p.variants ?? []).map((v) => ({
          promotionId: id,
          variantId: v.variantId,
          metadata: { discountPercent: v.discountPercent },
        })),
      )
      if (variantRows.length) {
        const { error: pvError } = await supabase().from("PromotionVariant").insert(variantRows)
        if (pvError) throw new Error(pvError.message)
      }
    }
  }
  return updated

}

export const financeSummary = async () => {
  const { data: orders, error: ordersError } = await supabase().from("Order").select("total")
  if (ordersError) throw new Error(ordersError.message)
  const { data: refunds, error: refundsError } = await supabase().from("RefundRecord").select("amount").eq("status", "completed")
  if (refundsError) throw new Error(refundsError.message)
  const grossSales = (orders ?? []).reduce((sum, row: any) => sum + Number(row.total ?? 0), 0)
  const refundsTotal = (refunds ?? []).reduce((sum, row: any) => sum + Number(row.amount ?? 0), 0)
  const netRevenue = grossSales - refundsTotal
  return { grossSales, netRevenue, orderCount: (orders ?? []).length, refundsTotal }
}
export const listWithdrawals = () =>
  supabase()
    .from("WithdrawalRequest")
    .select("*,createdBy:User!WithdrawalRequest_createdById_fkey(id,name,email),managedBy:User!WithdrawalRequest_managedById_fkey(id,name,email)")
    .order("createdAt", { ascending: false })
    .limit(100)
    .then(({ data, error }) => {
      if (error) throw new Error(error.message)
      return data ?? []
    })

export const updateWithdrawalStatus = (id: string, status: string) =>
  supabase().from("WithdrawalRequest").update({ status }).eq("id", id).select("*").single().then(({ data, error }) => {
    if (error) throw new Error(error.message)
    return data
  })

export const listRefunds = (page = 1, limit = 20) =>
  supabase()
    .from("RefundRecord")
    .select("*,order:Order(id,total)")
    .order("createdAt", { ascending: false })
    .range((Math.max(page, 1) - 1) * Math.min(Math.max(limit, 1), 100), Math.max(page, 1) * Math.min(Math.max(limit, 1), 100) - 1)
    .then(({ data, error }) => {
      if (error) throw new Error(error.message)
      return data ?? []
    })

export const createRefund = async (orderId: string, amount: number, reason?: string) => {
  const { data: order, error: orderError } = await supabase().from("Order").select("id,total").eq("id", orderId).maybeSingle()
  if (orderError) throw new Error(orderError.message)
  if (!order) throw new Error("Order not found")
  const { data: refunds, error: refundsError } = await supabase().from("RefundRecord").select("amount,status").eq("orderId", orderId)
  if (refundsError) throw new Error(refundsError.message)
  const alreadyRefunded = (refunds ?? [])
    .filter((row: any) => !["rejected", "failed"].includes(String(row.status ?? "")))
    .reduce((sum: number, row: any) => sum + Number(row.amount ?? 0), 0)
  const refundable = Number((order as any).total ?? 0) - alreadyRefunded
  if (refundable <= 0) throw new Error("Order already fully refunded")
  if (amount > refundable) throw new Error(`Amount exceeds refundable balance (${refundable.toFixed(2)})`)
  const { data: created, error: createError } = await supabase()
    .from("RefundRecord")
    .insert({ orderId, amount, reason: reason ?? null, status: "pending" })
    .select("*")
    .single()
  if (createError) throw new Error(createError.message)
  const { error: orderUpdateError } = await supabase().from("Order").update({ refundStatus: "PENDING" }).eq("id", orderId)
  if (orderUpdateError) throw new Error(orderUpdateError.message)
  return created
}

export const updateRefundStatus = (id: string, status: string) =>
  supabase().from("RefundRecord").update({ status }).eq("id", id).select("*").single().then(({ data, error }) => {
    if (error) throw new Error(error.message)
    return data
  })

export const reportTopProducts = async (limit = 20) => {
  const { data: items, error: itemsError } = await supabase().from("OrderItem").select("productId,quantity,lineTotal")
  if (itemsError) throw new Error(itemsError.message)
  const grouped = new Map<string, { units: number; revenue: number }>()
  for (const row of items ?? []) {
    const productId = String((row as any).productId ?? "")
    if (!productId) continue
    const curr = grouped.get(productId) ?? { units: 0, revenue: 0 }
    curr.units += Number((row as any).quantity ?? 0)
    curr.revenue += Number((row as any).lineTotal ?? 0)
    grouped.set(productId, curr)
  }
  const sorted = [...grouped.entries()].sort((a, b) => b[1].revenue - a[1].revenue).slice(0, limit)
  const ids = sorted.map(([id]) => id)
  const { data: products, error: productsError } = await supabase().from("Product").select("id,name,slug").in("id", ids)
  if (productsError) throw new Error(productsError.message)
  const byId = Object.fromEntries((products ?? []).map((p: any) => [p.id, p]))
  return sorted.map(([productId, agg]) => ({
    productId,
    name: byId[productId]?.name ?? "—",
    slug: byId[productId]?.slug ?? "",
    units: agg.units,
    revenue: agg.revenue,
  }))
}

export const reportPlatformPerformance = async () => {
  const { data: rows, error } = await supabase().from("OrderItem").select("lineTotal")
  if (error) throw new Error(error.message)
  const revenue = (rows ?? []).reduce((sum, row: any) => sum + Number(row.lineTotal ?? 0), 0)
  return [
    {
      sellerId: "platform",
      name: "Platform",
      email: "",
      revenue,
      lines: (rows ?? []).length,
    },
  ]
}

// Backward-compatible export for /api/v1/reports/sellers route name.
export const reportSellerPerformance = reportPlatformPerformance

export const listUserAddresses = (userId: string) =>
  listUserAddressesSupabase(userId)

export const createUserAddress = (
  userId: string,
  data: {
    label?: string | null
    firstName?: string | null
    lastName?: string | null
    email?: string | null
    line1: string
    line2?: string | null
    city: string
    state: string
    postalCode: string
    country?: string
    phone?: string | null
    isDefault?: boolean
  },
) =>
  createUserAddressSupabase(userId, data)

export const updateUserAddress = async (
  id: string,
  userId: string,
  data: Partial<{
    firstName?: string | null
    lastName?: string | null
    email?: string | null
    label?: string | null
    line1?: string
    line2?: string | null
    city?: string
    state?: string
    postalCode?: string
    country?: string
    phone?: string | null
    isDefault?: boolean
  }>,
) => {
  return updateUserAddressSupabase(id, userId, data)
}

export const deleteUserAddress = (id: string, userId: string) =>
  deleteUserAddressSupabase(id, userId)

export const listSavedPaymentMethods = (userId: string) =>
  supabase()
    .from("SavedPaymentMethod")
    .select("*")
    .eq("userId", userId)
    .order("createdAt", { ascending: false })
    .then(({ data, error }) => {
      if (error) throw new Error(error.message)
      return data ?? []
    })

export const createSavedPaymentMethod = (
  userId: string,
  data: { provider: string; externalRef: string; last4?: string; brand?: string; isDefault?: boolean },
) =>
  supabase()
    .from("SavedPaymentMethod")
    .insert({ ...data, userId })
    .select("*")
    .single()
    .then(({ data, error }) => {
      if (error) throw new Error(error.message)
      return data
    })

export async function deleteAbandonedCartBySession(sessionKey: string) {
  const { data, error } = await supabase().from("AbandonedCart").delete().eq("sessionKey", sessionKey).select("id")
  if (error) throw new Error(error.message)
  return { count: (data ?? []).length }
}
