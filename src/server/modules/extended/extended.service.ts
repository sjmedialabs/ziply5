import { prisma } from "@/src/server/db/prisma"
import { createBrandSupabase, listBrandsSupabase } from "@/src/lib/db/brands"
import {
  createUserAddressSupabase,
  deleteUserAddressSupabase,
  listUserAddressesSupabase,
  updateUserAddressSupabase,
} from "@/src/lib/db/users"
import { logger } from "@/lib/logger"

export const listBrands = async () => {
  try {
    return await listBrandsSupabase()
  } catch (error) {
    logger.warn("brands.list.supabase_fallback_prisma", {
      error: error instanceof Error ? error.message : "unknown",
    })
    return prisma.brand.findMany({ orderBy: { name: "asc" } })
  }
}

export const createBrand = (name: string, slug: string) =>
  createBrandSupabase({ name, slug }).catch((error) => {
    logger.warn("brands.create.supabase_fallback_prisma", {
      error: error instanceof Error ? error.message : "unknown",
    })
    return prisma.brand.create({ data: { name, slug: slug.trim().toLowerCase().replace(/\s+/g, "-") } })
  })

export const listTags = () => prisma.tag.findMany({ orderBy: { name: "asc" } })

export const createTag = (name: string, slug: string) =>
  prisma.tag.create({
    data: { name, slug: slug.trim().toLowerCase().replace(/\s+/g, "-") },
  })

export const updateTag = async (id: string, name: string, slug: string, isActive: boolean) => {
  return prisma.tag.update({
    where: { id },
    data: { 
      ...(name !== undefined ? { name } : {}),
      ...(slug !== undefined ? { slug: slug.trim().toLowerCase().replace(/\s+/g, "-") } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
  })
}

export const listAttributeDefs = () => prisma.attributeDef.findMany({ orderBy: { name: "asc" } })

export const createAttributeDef = (name: string, slug: string) =>
  prisma.attributeDef.create({
    data: { name, slug: slug.trim().toLowerCase().replace(/\s+/g, "-") },
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
  const rows = await prisma.inventoryItem.findMany({
    include: { product: { select: { name: true, slug: true } } },
    orderBy: { available: "asc" },
    take: 200,
  })
  const fromWarehouse: InventoryRow[] = rows.map((r) => ({
    id: r.id,
    productId: r.productId,
    warehouse: r.warehouse,
    available: r.available,
    reserved: r.reserved,
    source: "warehouse" as const,
    product: r.product,
  }))
  const variants = await prisma.productVariant.findMany({
    include: { product: { select: { name: true, slug: true } } },
    orderBy: { stock: "asc" },
    take: 200,
  })
  const fromVariant: InventoryRow[] = variants.map((v) => ({
    id: v.id,
    productId: v.productId,
    warehouse: null,
    available: v.stock,
    reserved: 0,
    source: "variant" as const,
    variantName: v.name,
    product: v.product,
  }))
  if (fromWarehouse.length > 0) return fromWarehouse
  return fromVariant
}

export const updateInventoryItem = async (id: string, available: number, reserved?: number) => {
  return prisma.inventoryItem.update({
    where: { id },
    data: { available, ...(reserved !== undefined ? { reserved } : {}) },
    include: { product: { select: { name: true, slug: true } } },
  })
}

export const updateVariantStock = async (id: string, stock: number) => {
  return prisma.productVariant.update({
    where: { id },
    data: { stock },
    include: { product: { select: { name: true, slug: true } } },
  })
}

export const listReviews = (status?: string) =>
  prisma.productReview.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { product: { select: { name: true, slug: true } }, user: { select: { email: true, name: true } } },
  })

export const updateReviewStatus = (id: string, status: string) =>
  prisma.productReview.update({ where: { id }, data: { status } })

export const createReview = async (input: {
  productId: string
  userId?: string | null
  guestName?: string | null
  guestEmail?: string | null
  rating: number
  title?: string
  body?: string
}) => {
  return prisma.productReview.create({
    data: {
      productId: input.productId,
      userId: input.userId ?? undefined,
      guestName: input.guestName ?? undefined,
      guestEmail: input.guestEmail ?? undefined,
      rating: input.rating,
      title: input.title,
      body: input.body,
      status: "pending",
    },
  })
}

export const listReturnRequests = () =>
  prisma.returnRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      order: {
        select: {
          id: true,
          total: true,
          status: true,
          userId: true,
          refunds: { select: { id: true, amount: true, status: true, createdAt: true } },
        },
      },
      pickup: true,
      items: true,
    },
  })

export const updateReturnStatus = (id: string, status: string) =>
  prisma.returnRequest.update({ where: { id }, data: { status } })

export const createReturnRequest = async (orderId: string, userId: string | null, reason?: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { returnRequests: true },
  })
  if (!order) throw new Error("Order not found")
  if (order.status !== "delivered") throw new Error("Returns are allowed only for delivered orders")

  const duplicate = order.returnRequests.find((row) => row.status !== "rejected")
  if (duplicate) throw new Error("Return request already exists for this order")

  return prisma.returnRequest.create({
    data: {
      orderId,
      userId: userId ?? undefined,
      reason: reason?.trim() || null,
      status: "requested",
    },
    include: {
      order: { select: { id: true, total: true, status: true } },
      pickup: true,
      items: true,
    },
  })
}

export const listAbandonedCarts = () =>
  prisma.abandonedCart.findMany({ orderBy: { updatedAt: "desc" }, take: 100 })

export const upsertAbandonedCart = async (input: {
  sessionKey: string
  email?: string | null
  itemsJson: unknown
  total?: number | null
}) => {
  return prisma.abandonedCart.upsert({
    where: { sessionKey: input.sessionKey },
    create: {
      sessionKey: input.sessionKey,
      email: input.email ?? undefined,
      itemsJson: input.itemsJson as never,
      total: input.total ?? undefined,
    },
    update: {
      email: input.email ?? undefined,
      itemsJson: input.itemsJson as never,
      total: input.total ?? undefined,
    },
  })
}

export const listPromotions = () =>
  prisma.promotion.findMany({
    orderBy: { updatedAt: "desc" },
    take: 100,

    include: {
      products: {
        include: {
          product: true,
        },
      },

      variants: {
        include: {
          variant: true,
        },
      },
    },
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

  return prisma.promotion.create({

    data: {

      kind: input.kind,

      name: input.name,

      active: input.active ?? true,

      startsAt: input.startsAt ?? undefined,

      endsAt: input.endsAt ?? undefined,

      /* 🔥 Store product-level discount */

      metadata: {

        products:
          input.products?.map(p => ({

            productId: p.productId,

            discountPercent:
              p.discountPercent ?? null

          })) ?? []

      },

      /* Product links */

      products: input.products
        ? {
            create: input.products.map((p) => ({

              product: {

                connect: {

                  id: p.productId,

                },

              },

            })),
          }
        : undefined,

      /* Variant discounts */

      variants: input.products
        ? {
            create: input.products.flatMap((p) =>

              p.variants
                ? p.variants.map((v) => ({

                    variant: {

                      connect: {

                        id: v.variantId,

                      },

                    },

                    metadata: {

                      discountPercent:
                        v.discountPercent,

                    },

                  }))
                : []

            ),
          }
        : undefined,

    },

  })

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

  return prisma.promotion.update({

    where: { id },

    data: {

      /* ---------- BASIC FIELDS ---------- */

      kind: input.kind,

      name: input.name,

      active: input.active,

      startsAt:
        input.startsAt ?? undefined,

      endsAt:
        input.endsAt ?? undefined,

      /* ---------- STORE SIMPLE PRODUCT DISCOUNTS ---------- */

      metadata:
        input.products
          ? {
              products: input.products.map(p => ({

                productId: p.productId,

                discountPercent:
                  p.discountPercent ?? null

              }))
            }
          : input.metadata === undefined
            ? undefined
            : (input.metadata as never),

      /* ---------- REPLACE PRODUCT LINKS ---------- */

      products: input.products
        ? {

            deleteMany: {},

            create: input.products.map(p => ({

              product: {

                connect: {
                  id: p.productId
                }

              }

            }))

          }
        : undefined,

      /* ---------- REPLACE VARIANT DISCOUNTS ---------- */

      variants: input.products
        ? {

            deleteMany: {},

            create: input.products.flatMap(p =>

              p.variants
                ? p.variants.map(v => ({

                    variant: {

                      connect: {
                        id: v.variantId
                      }

                    },

                    metadata: {

                      discountPercent:
                        v.discountPercent

                    }

                  }))
                : []

            )

          }
        : undefined,

    }

  })

}

export const financeSummary = async () => {

  // 1️⃣ Total Sales
  const sales = await prisma.order.aggregate({
    _sum: { total: true },
    _count: true,
  });

  // 2️⃣ Completed Refunds only
  const completedRefunds =
    await prisma.refundRecord.aggregate({
      where: {
        status: "completed",
      },
      _sum: {
        amount: true,
      },
    });

  const grossSales =
    sales._sum.total ?? 0;

  const refundsTotal =
    completedRefunds._sum.amount ?? 0;

  // ✅ Net Revenue Calculation
  const netRevenue =
    grossSales - refundsTotal;

  return {

    grossSales,

    netRevenue, // ⭐ NEW (Important)

    orderCount: sales._count,

    refundsTotal,

  };
};
export const listWithdrawals = () =>
  prisma.withdrawalRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      managedBy: { select: { id: true, name: true, email: true } },
    },
  })

export const updateWithdrawalStatus = (id: string, status: string) =>
  prisma.withdrawalRequest.update({ where: { id }, data: { status } })

export const listRefunds = (page = 1, limit = 20) =>
  prisma.refundRecord.findMany({
    orderBy: { createdAt: "desc" },
    skip: (Math.max(page, 1) - 1) * Math.min(Math.max(limit, 1), 100),
    take: Math.min(Math.max(limit, 1), 100),
    include: { order: { select: { id: true, total: true } } },
  })

export const createRefund = (orderId: string, amount: number, reason?: string) =>
  prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { refunds: true },
    })
    if (!order) throw new Error("Order not found")

    const alreadyRefunded = order.refunds
      .filter((row) => !["rejected", "failed"].includes(row.status))
      .reduce((sum, row) => sum + Number(row.amount), 0)
    const refundable = Number(order.total) - alreadyRefunded
    if (refundable <= 0) throw new Error("Order already fully refunded")
    if (amount > refundable) throw new Error(`Amount exceeds refundable balance (${refundable.toFixed(2)})`)

    const created = await tx.refundRecord.create({
      data: {
        orderId,
        amount,
        reason,
        status: "pending",
      },
    })
    await tx.$executeRawUnsafe('UPDATE "Order" SET "refundStatus" = $1 WHERE id = $2', "PENDING", orderId)
    return created
  })

export const updateRefundStatus = (id: string, status: string) =>
  prisma.refundRecord.update({ where: { id }, data: { status } })

export const reportTopProducts = async (limit = 20) => {
  const rows = await prisma.orderItem.groupBy({
    by: ["productId"],
    _sum: { quantity: true, lineTotal: true },
    orderBy: { _sum: { lineTotal: "desc" } },
    take: limit,
  })
  const products = await prisma.product.findMany({
    where: { id: { in: rows.map((r) => r.productId) } },
    select: { id: true, name: true, slug: true },
  })
  const byId = Object.fromEntries(products.map((p) => [p.id, p]))
  return rows.map((r) => ({
    productId: r.productId,
    name: byId[r.productId]?.name ?? "—",
    slug: byId[r.productId]?.slug ?? "",
    units: r._sum.quantity ?? 0,
    revenue: r._sum.lineTotal ?? 0,
  }))
}

export const reportPlatformPerformance = async () => {
  const totals = await prisma.orderItem.aggregate({
    _sum: { lineTotal: true },
    _count: { _all: true },
  })
  return [
    {
      sellerId: "platform",
      name: "Platform",
      email: "",
      revenue: Number(totals._sum.lineTotal ?? 0),
      lines: totals._count._all ?? 0,
    },
  ]
}

// Backward-compatible export for /api/v1/reports/sellers route name.
export const reportSellerPerformance = reportPlatformPerformance

export const listUserAddresses = (userId: string) =>
  listUserAddressesSupabase(userId).catch((error) => {
    logger.warn("addresses.list.supabase_fallback_prisma", {
      error: error instanceof Error ? error.message : "unknown",
    })
    return prisma.userAddress.findMany({ where: { userId }, orderBy: { createdAt: "desc" } })
  })

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
  createUserAddressSupabase(userId, data).catch((error) => {
    logger.warn("addresses.create.supabase_fallback_prisma", {
      error: error instanceof Error ? error.message : "unknown",
    })
    return prisma.userAddress.create({ data: { ...data, userId } })
  })

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
  try {
    const result = await updateUserAddressSupabase(id, userId, data)
    if (result.count > 0) return result
  } catch (error) {
    logger.warn("addresses.update.supabase_fallback_prisma", {
      error: error instanceof Error ? error.message : "unknown",
    })
  }
  const found = await prisma.userAddress.findFirst({ where: { id, userId } })
  if (!found) return { count: 0 }
  await prisma.userAddress.update({ where: { id }, data })
  return { count: 1 }
}

export const deleteUserAddress = (id: string, userId: string) =>
  deleteUserAddressSupabase(id, userId).catch((error) => {
    logger.warn("addresses.delete.supabase_fallback_prisma", {
      error: error instanceof Error ? error.message : "unknown",
    })
    return prisma.userAddress.deleteMany({ where: { id, userId } })
  })

export const listSavedPaymentMethods = (userId: string) =>
  prisma.savedPaymentMethod.findMany({ where: { userId }, orderBy: { createdAt: "desc" } })

export const createSavedPaymentMethod = (
  userId: string,
  data: { provider: string; externalRef: string; last4?: string; brand?: string; isDefault?: boolean },
) => prisma.savedPaymentMethod.create({ data: { ...data, userId } })

export async function deleteAbandonedCartBySession(sessionKey: string) {
  return prisma.abandonedCart.deleteMany({
    where: { sessionKey },
  });
}
