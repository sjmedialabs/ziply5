import { prisma } from "@/src/server/db/prisma"

export const listBrands = () => prisma.brand.findMany({ orderBy: { name: "asc" } })

export const createBrand = (name: string, slug: string) =>
  prisma.brand.create({ data: { name, slug: slug.trim().toLowerCase().replace(/\s+/g, "-") } })

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
    include: { order: { select: { id: true, total: true, status: true, userId: true } } },
  })

export const updateReturnStatus = (id: string, status: string) =>
  prisma.returnRequest.update({ where: { id }, data: { status } })

export const createReturnRequest = async (orderId: string, userId: string | null, reason?: string) => {
  return prisma.returnRequest.create({
    data: { orderId, userId: userId ?? undefined, reason },
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

export const listPromotions = () => prisma.promotion.findMany({ orderBy: { updatedAt: "desc" }, take: 100 })

export const createPromotion = (input: {
  kind: string
  name: string
  active?: boolean
  startsAt?: Date | null
  endsAt?: Date | null
  productId?: string | null
  metadata?: unknown
}) =>
  prisma.promotion.create({
    data: {
      kind: input.kind,
      name: input.name,
      active: input.active ?? true,
      startsAt: input.startsAt ?? undefined,
      endsAt: input.endsAt ?? undefined,
      productId: input.productId ?? undefined,
      metadata: input.metadata === undefined ? undefined : (input.metadata as never),
    },
  })

export const updatePromotion = async (
  id: string,
  input: Partial<{
    kind: string
    name: string
    active: boolean
    startsAt: Date | null
    endsAt: Date | null
    productId: string | null 
    metadata: unknown
  }>,
) => {
  return prisma.promotion.update({
    where: { id },
    data: {
      ...input,
      metadata: input.metadata === undefined ? undefined : (input.metadata as never),
    },
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

  // 3️⃣ Pending Withdrawals
  const pendingWd =
    await prisma.withdrawalRequest.count({
      where: {
        status: "pending",
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

    pendingWithdrawals: pendingWd,

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

export const listRefunds = () =>
  prisma.refundRecord.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { order: { select: { id: true, total: true } } },
  })

export const createRefund = (orderId: string, amount: number, reason?: string) =>
  prisma.refundRecord.create({ data: { orderId, amount, reason, status: "pending" } })

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
  prisma.userAddress.findMany({ where: { userId }, orderBy: { createdAt: "desc" } })

export const createUserAddress = (
  userId: string,
  data: {
    label?: string | null
    line1: string
    line2?: string | null
    city: string
    state: string
    postalCode: string
    country?: string
    phone?: string | null
    isDefault?: boolean
  },
) => prisma.userAddress.create({ data: { ...data, userId } })

export const updateUserAddress = async (
  id: string,
  userId: string,
  data: Partial<{
    label: string | null
    line1: string
    line2: string | null
    city: string
    state: string
    postalCode: string
    country: string
    phone: string | null
    isDefault: boolean
  }>,
) => {
  const found = await prisma.userAddress.findFirst({ where: { id, userId } })
  if (!found) return { count: 0 }
  await prisma.userAddress.update({ where: { id }, data })
  return { count: 1 }
}

export const deleteUserAddress = (id: string, userId: string) =>
  prisma.userAddress.deleteMany({ where: { id, userId } })

export const listSavedPaymentMethods = (userId: string) =>
  prisma.savedPaymentMethod.findMany({ where: { userId }, orderBy: { createdAt: "desc" } })

export const createSavedPaymentMethod = (
  userId: string,
  data: { provider: string; externalRef: string; last4?: string; brand?: string; isDefault?: boolean },
) => prisma.savedPaymentMethod.create({ data: { ...data, userId } })
