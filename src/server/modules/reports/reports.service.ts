import { prisma } from "@/src/server/db/prisma"

export const salesSummary = async (
  from: Date,
  to: Date,
  preparationType?: string | null,
  tagId?: string | null
) => {

  // Base order filter
  const baseWhere: any = {
    createdAt: { gte: from, lte: to },
  };

  // Build product filter safely
  const productFilter: any = {};

  if (preparationType) {
    productFilter.preparationType = preparationType;
  }

  if (tagId) {
    productFilter.tags = {
      some: {
        tagId,
      },
    };
  }

  // Apply product filters to orders
  if (Object.keys(productFilter).length > 0) {
    baseWhere.items = {
      some: {
        product: productFilter,
      },
    };
  }

  // OrderItem filter
  const orderItemWhere: any = {
    order: {
      createdAt: { gte: from, lte: to },
    },
  };

  if (Object.keys(productFilter).length > 0) {
    orderItemWhere.product = productFilter;
  }

  // 🔹 Aggregate Orders
  const agg = await prisma.order.aggregate({
    where: baseWhere,
    _sum: {
      total: true,
      subtotal: true,
    },
    _count: true,
  });

  // 🔹 Status Summary
  const byStatus = await prisma.order.groupBy({
    by: ["status"],
    where: baseWhere,
    _count: true,
    _sum: {
      total: true,
    },
  });

  // 🔹 Product Summary
  const productSummary =
    await prisma.orderItem.groupBy({
      by: ["productId"],

      where: orderItemWhere,

      _sum: {
        quantity: true,
      },

      orderBy: {
        _sum: {
          quantity: "desc",
        },
      },

      take: 50,
    });

  // 🔹 Refund Summary (NEW)
  const refundAgg =
    await prisma.refundRecord.aggregate({
      where: {
        status: "completed",

        order: baseWhere,
      },

      _sum: {
        amount: true,
      },
    });

  const refundedAmount =
    refundAgg._sum.amount ?? 0;

  // Existing revenue (unchanged)
  const revenueTotal =
    agg._sum.total ?? 0;

  // NEW net sale calculation
  const netSale =
    Number(revenueTotal) -
    Number(refundedAmount);

  // Fetch product names
  const productIds =
    productSummary.map(p => p.productId);

  const products =
    await prisma.product.findMany({
      where: {
        id: { in: productIds },
      },
      select: {
        id: true,
        name: true,
      },
    });

  const productMap = new Map(
    products.map(p => [p.id, p.name])
  );

  return {

    from,
    to,

    orderCount: agg._count,

    revenueTotal,

    subtotalTotal:
      agg._sum.subtotal ?? 0,

    // ✅ NEW FIELDS
    refundedAmount,

    netSale,

    byStatus: byStatus.map(row => ({
      status: row.status,
      count: row._count,
      revenue: row._sum.total ?? 0,
    })),

    products: productSummary.map(row => ({
      productId: row.productId,

      productName:
        productMap.get(row.productId) ?? "Unknown",

      totalQuantity:
        row._sum.quantity ?? 0,
    })),

  };
};