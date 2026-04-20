import { prisma } from "@/src/server/db/prisma"

export const salesSummary = async (
  from: Date,
  to: Date,
  preparationType?: string | null
) => {

  const baseWhere: any = {
    createdAt: { gte: from, lte: to },
  };

  // ✅ Add preparation filter
  if (preparationType) {
    baseWhere.items = {
      some: {
        product: {
          preparationType: preparationType,
        },
      },
    };
  }

  const [agg, byStatus] = await Promise.all([

    prisma.order.aggregate({
      where: baseWhere,
      _sum: {
        total: true,
        subtotal: true,
      },
      _count: true,
    }),

    prisma.order.groupBy({
      by: ["status"],
      where: baseWhere,
      _count: true,
      _sum: {
        total: true,
      },
    }),

  ]);

  return {
    from,
    to,
    orderCount: agg._count,
    revenueTotal: agg._sum.total ?? 0,
    subtotalTotal: agg._sum.subtotal ?? 0,

    byStatus: byStatus.map((row) => ({
      status: row.status,
      count: row._count,
      revenue: row._sum.total ?? 0,
    })),
  };
};
