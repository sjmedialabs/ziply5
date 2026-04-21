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

  // Build product filter
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

  // Apply product filter to orders
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
  const byStatusRaw = await prisma.order.groupBy({
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

  // 🔹 Refund Summary
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

  const revenueTotal =
    agg._sum.total ?? 0;

  const netSale =
    Number(revenueTotal) -
    Number(refundedAmount);

  // 🔹 Ensure cancelled exists in byStatus
  const statusMap = new Map(
    byStatusRaw.map(row => [
      row.status,
      {
        status: row.status,
        count: row._count,
        revenue: row._sum.total ?? 0,
      },
    ])
  );

  // Always include cancelled
  if (!statusMap.has("cancelled")) {
    statusMap.set("cancelled", {
      status: "cancelled",
      count: 0,
      revenue: 0,
    });
  }

  const formattedStatus =
    Array.from(statusMap.values());

  // 🔹 Fetch product names
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

    // ✅ New fields
    refundedAmount,

    netSale,

    // ✅ Updated status list
    byStatus: formattedStatus,

    products: productSummary.map(row => ({
      productId: row.productId,

      productName:
        productMap.get(row.productId) ?? "Unknown",

      totalQuantity:
        row._sum.quantity ?? 0,
    })),

  };
};