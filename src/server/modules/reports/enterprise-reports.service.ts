import { prisma } from "@/src/server/db/prisma"

export const getEnterpriseDashboard = async () => {
  const [revenueAgg, todayOrders, topProducts, lowStockLots, regionSales] = await Promise.all([
    prisma.order.aggregate({ _sum: { total: true }, _count: true }),
    prisma.order.count({
      where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
    prisma.inventoryStockLot.findMany({
      where: { qtyAvailable: { lte: 10 } },
      orderBy: [{ qtyAvailable: "asc" }, { expiryDate: "asc" }],
      include: { product: { select: { name: true } }, warehouse: { select: { name: true } } },
      take: 20,
    }),
    prisma.analyticsDailySalesSnapshot.groupBy({
      by: ["region"],
      _sum: { netSales: true },
      orderBy: { _sum: { netSales: "desc" } },
      take: 10,
    }).catch(() => [] as Array<{ region: string | null; _sum: { netSales: unknown } }>),
  ])

  const products = await prisma.product.findMany({
    where: { id: { in: topProducts.map((x) => x.productId) } },
    select: { id: true, name: true, slug: true },
  })
  const pById = Object.fromEntries(products.map((p) => [p.id, p]))

  return {
    revenueOverview: {
      totalRevenue: Number(revenueAgg._sum.total ?? 0),
      totalOrders: revenueAgg._count,
    },
    dailyOrders: todayOrders,
    topSellingProducts: topProducts.map((row) => ({
      productId: row.productId,
      name: pById[row.productId]?.name ?? "Unknown",
      slug: pById[row.productId]?.slug ?? "",
      units: row._sum.quantity ?? 0,
      revenue: Number(row._sum.lineTotal ?? 0),
    })),
    lowStockAlerts: lowStockLots.map((lot) => ({
      lotId: lot.id,
      productName: lot.product.name,
      warehouseName: lot.warehouse.name,
      qtyAvailable: lot.qtyAvailable,
      expiryDate: lot.expiryDate,
    })),
    regionWiseSales: regionSales.map((r) => ({
      region: r.region ?? "Unknown",
      netSales: Number(r._sum.netSales ?? 0),
    })),
  }
}

export const getCustomerSegmentation = async () => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      orders: {
        select: { id: true, total: true, createdAt: true, status: true },
      },
    },
  })

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  return users.map((u) => {
    const paidOrders = u.orders.filter((o) => o.status !== "cancelled")
    const totalSpent = paidOrders.reduce((acc, o) => acc + Number(o.total), 0)
    const orderCount = paidOrders.length
    const lastOrderAt = paidOrders.sort((a, b) => +b.createdAt - +a.createdAt)[0]?.createdAt ?? null
    const segment =
      totalSpent >= 5000
        ? "high_value"
        : orderCount >= 3
          ? "repeat_user"
          : !lastOrderAt || lastOrderAt < ninetyDaysAgo
            ? "inactive"
            : "regular"
    return {
      userId: u.id,
      name: u.name,
      email: u.email,
      totalSpent,
      orderCount,
      lastOrderAt,
      segment,
    }
  })
}
