import { prisma } from "@/src/server/db/prisma"

/** Avoid crashing the whole dashboard when optional tables are missing or DB is partial. */
const safe = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
  try {
    return await fn()
  } catch {
    return fallback
  }
}

export const getDashboardSummary = async () => {
  const [
    orders,
    users,
    sellers,
    revenueAgg,
    pendingOrders,
    recentOrders,
    lowStockVariants,
  ] = await Promise.all([
    safe(() => prisma.order.count(), 0),
    safe(() => prisma.user.count(), 0),
    safe(
      () =>
        prisma.userRole.count({
          where: { role: { key: "seller" } },
        }),
      0,
    ),
    safe(() => prisma.order.aggregate({ _sum: { total: true } }), { _sum: { total: null } }),
    safe(() => prisma.order.count({ where: { status: "pending" } }), 0),
    safe(
      () =>
        prisma.order.findMany({
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            status: true,
            total: true,
            createdAt: true,
            userId: true,
          },
        }),
      [],
    ),
    safe(
      () =>
        prisma.productVariant.findMany({
          where: { stock: { lte: 5 } },
          take: 10,
          orderBy: { stock: "asc" },
          include: { product: { select: { id: true, name: true, slug: true } } },
        }),
      [],
    ),
  ])

  return {
    totalOrders: orders,
    totalUsers: users,
    totalSellers: sellers,
    totalRevenue: revenueAgg._sum.total ?? 0,
    pendingOrders,
    recentOrders,
    lowStockVariants,
  }
}

export const getSellerDashboardSummary = async (sellerId: string) => {
  const [productCount, revenueAgg, orderIds] = await Promise.all([
    safe(() => prisma.product.count({ where: { sellerId } }), 0),
    safe(
      () =>
        prisma.orderItem.aggregate({
          where: { product: { sellerId } },
          _sum: { lineTotal: true },
        }),
      { _sum: { lineTotal: null } },
    ),
    safe(
      () =>
        prisma.orderItem.findMany({
          where: { product: { sellerId } },
          distinct: ["orderId"],
          select: { orderId: true },
        }),
      [],
    ),
  ])

  return {
    myProducts: productCount,
    ordersTouchingMyProducts: orderIds.length,
    revenueFromMyLines: revenueAgg._sum.lineTotal ?? 0,
  }
}
