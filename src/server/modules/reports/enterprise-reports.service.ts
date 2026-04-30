import { pgQuery } from "@/src/server/db/pg"

export const getEnterpriseDashboard = async () => {
  const startToday = new Date(new Date().setHours(0, 0, 0, 0))
  const [revenueAggRows, todayOrdersRows, topProducts, lowStockLots, regionSales] = await Promise.all([
    pgQuery<Array<{ total_revenue: number; total_orders: number }>>(
      `SELECT COALESCE(SUM(total),0)::numeric as total_revenue, COUNT(*)::int as total_orders FROM "Order"`,
    ),
    pgQuery<Array<{ today_orders: number }>>(
      `SELECT COUNT(*)::int as today_orders FROM "Order" WHERE "createdAt" >= $1`,
      [startToday],
    ),
    pgQuery<Array<{ productId: string; units: number; revenue: number }>>(
      `
        SELECT "productId" as "productId",
               COALESCE(SUM(quantity),0)::int as units,
               COALESCE(SUM("lineTotal"),0)::numeric as revenue
        FROM "OrderItem"
        GROUP BY "productId"
        ORDER BY COALESCE(SUM(quantity),0) DESC
        LIMIT 5
      `,
    ),
    pgQuery<Array<{ id: string; qtyAvailable: number; expiryDate: Date | null; productName: string; warehouseName: string }>>(
      `
        SELECT l.id, l."qtyAvailable", l."expiryDate",
               p.name as "productName",
               w.name as "warehouseName"
        FROM "InventoryStockLot" l
        INNER JOIN "Product" p ON p.id = l."productId"
        INNER JOIN "Warehouse" w ON w.id = l."warehouseId"
        WHERE l."qtyAvailable" <= 10
        ORDER BY l."qtyAvailable" ASC, l."expiryDate" ASC NULLS LAST
        LIMIT 20
      `,
    ),
    pgQuery<Array<{ region: string | null; netSales: number }>>(
      `
        SELECT region, COALESCE(SUM("netSales"),0)::numeric as "netSales"
        FROM "AnalyticsDailySalesSnapshot"
        GROUP BY region
        ORDER BY COALESCE(SUM("netSales"),0) DESC
        LIMIT 10
      `,
    ).catch(() => []),
  ])

  const revenueAgg = revenueAggRows[0] ?? { total_revenue: 0, total_orders: 0 }
  const todayOrders = Number(todayOrdersRows[0]?.today_orders ?? 0)

  const products = topProducts.length
    ? await pgQuery<Array<{ id: string; name: string; slug: string }>>(
        `SELECT id, name, slug FROM "Product" WHERE id = ANY($1::text[])`,
        [topProducts.map((x) => x.productId)],
      )
    : []
  const pById = Object.fromEntries(products.map((p) => [p.id, p]))

  return {
    revenueOverview: {
      totalRevenue: Number(revenueAgg.total_revenue ?? 0),
      totalOrders: Number(revenueAgg.total_orders ?? 0),
    },
    dailyOrders: todayOrders,
    topSellingProducts: topProducts.map((row) => ({
      productId: row.productId,
      name: pById[row.productId]?.name ?? "Unknown",
      slug: pById[row.productId]?.slug ?? "",
      units: Number(row.units ?? 0),
      revenue: Number((row as any).revenue ?? 0),
    })),
    lowStockAlerts: lowStockLots.map((lot) => ({
      lotId: lot.id,
      productName: (lot as any).productName,
      warehouseName: (lot as any).warehouseName,
      qtyAvailable: lot.qtyAvailable,
      expiryDate: lot.expiryDate,
    })),
    regionWiseSales: regionSales.map((r) => ({
      region: r.region ?? "Unknown",
      netSales: Number((r as any).netSales ?? 0),
    })),
  }
}

export const getCustomerSegmentation = async () => {
  const users = await pgQuery<
    Array<{
      id: string
      name: string | null
      email: string
      orders: Array<{ id: string; total: number; createdAt: Date; status: string }>
    }>
  >(
    `
      SELECT
        u.id,
        u.name,
        u.email,
        COALESCE((
          SELECT jsonb_agg(jsonb_build_object('id', o.id, 'total', o.total, 'createdAt', o."createdAt", 'status', o.status) ORDER BY o."createdAt" DESC)
          FROM "Order" o
          WHERE o."userId" = u.id
        ), '[]'::jsonb) as orders
      FROM "User" u
    `,
  )

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  return users.map((u) => {
    const orders = Array.isArray((u as any).orders) ? ((u as any).orders as any[]) : []
    const paidOrders = orders.filter((o) => o.status !== "cancelled")
    const totalSpent = paidOrders.reduce((acc, o) => acc + Number(o.total ?? 0), 0)
    const orderCount = paidOrders.length
    const lastOrderAt = (paidOrders[0]?.createdAt ? new Date(paidOrders[0].createdAt) : null) as Date | null
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
