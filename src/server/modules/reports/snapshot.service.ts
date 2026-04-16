import { prisma } from "@/src/server/db/prisma"

const dayBounds = (date: Date) => {
  const from = new Date(date)
  from.setHours(0, 0, 0, 0)
  const to = new Date(from)
  to.setDate(to.getDate() + 1)
  return { from, to }
}

export const buildDailySnapshots = async (date: Date) => {
  const { from, to } = dayBounds(date)

  const [agg, itemsAgg] = await Promise.all([
    prisma.order.aggregate({
      where: { createdAt: { gte: from, lt: to } },
      _count: true,
      _sum: { total: true, subtotal: true, shipping: true },
    }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: { order: { createdAt: { gte: from, lt: to } } },
      _sum: { quantity: true, lineTotal: true },
    }),
  ])

  const grossSales = Number(agg._sum.subtotal ?? 0) + Number(agg._sum.shipping ?? 0)
  const netSales = Number(agg._sum.total ?? 0)
  const discountTotal = Math.max(0, grossSales - netSales)

  await prisma.$transaction(async (tx) => {
    await tx.analyticsDailySalesSnapshot.deleteMany({
      where: { snapshotDate: from, region: null },
    })
    await tx.analyticsDailySalesSnapshot.create({
      data: {
        snapshotDate: from,
        region: null,
        currency: "INR",
        orderCount: agg._count,
        grossSales,
        netSales,
        discountTotal,
        refundTotal: 0,
      },
    })

    await tx.analyticsDailyProductSnapshot.deleteMany({
      where: { snapshotDate: from },
    })
    if (itemsAgg.length > 0) {
      await tx.analyticsDailyProductSnapshot.createMany({
        data: itemsAgg.map((row) => ({
          snapshotDate: from,
          productId: row.productId,
          unitsSold: row._sum.quantity ?? 0,
          revenue: Number(row._sum.lineTotal ?? 0),
          returns: 0,
          stockOnHand: 0,
        })),
      })
    }

    await tx.analyticsJobRun.upsert({
      where: { jobKey: "daily_snapshots" },
      create: {
        jobKey: "daily_snapshots",
        status: "success",
        lastSuccessAt: new Date(),
        watermark: from.toISOString(),
      },
      update: {
        status: "success",
        lastSuccessAt: new Date(),
        watermark: from.toISOString(),
        errorMessage: null,
      },
    })
  })

  return {
    snapshotDate: from.toISOString(),
    orderCount: agg._count,
    products: itemsAgg.length,
    grossSales,
    netSales,
  }
}
