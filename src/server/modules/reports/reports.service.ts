import { pgQuery } from "@/src/server/db/pg"

export const salesSummary = async (
  from: Date,
  to: Date,
  preparationType?: string | null,
  tagId?: string | null
) => {
  const values: any[] = [from, to]
  const joins: string[] = []
  const where: string[] = [`o."createdAt" >= $1`, `o."createdAt" <= $2`]

  if (preparationType) {
    values.push(preparationType)
    joins.push(`INNER JOIN "OrderItem" oi_f ON oi_f."orderId" = o.id`)
    joins.push(`INNER JOIN "Product" p_f ON p_f.id = oi_f."productId"`)
    where.push(`p_f."preparationType" = $${values.length}`)
  }
  if (tagId) {
    values.push(tagId)
    joins.push(`INNER JOIN "OrderItem" oi_t ON oi_t."orderId" = o.id`)
    joins.push(`INNER JOIN "ProductTag" pt ON pt."productId" = oi_t."productId"`)
    where.push(`pt."tagId" = $${values.length}`)
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : ""
  const joinSql = joins.length ? joins.join("\n") : ""

  const [aggRows, byStatus, productSummary, refundedRows] = await Promise.all([
    pgQuery<Array<{ revenue_total: number; subtotal_total: number; order_count: number }>>(
      `
        SELECT
          COALESCE(SUM(o.total),0)::numeric as revenue_total,
          COALESCE(SUM(o.subtotal),0)::numeric as subtotal_total,
          COUNT(*)::int as order_count
        FROM "Order" o
        ${joinSql}
        ${whereSql}
      `,
      values,
    ),
    pgQuery<Array<{ status: string; count: number; revenue: number }>>(
      `
        SELECT o.status as status, COUNT(*)::int as count, COALESCE(SUM(o.total),0)::numeric as revenue
        FROM "Order" o
        ${joinSql}
        ${whereSql}
        GROUP BY o.status
      `,
      values,
    ),
    pgQuery<Array<{ productId: string; totalQuantity: number }>>(
      `
        SELECT oi."productId" as "productId", COALESCE(SUM(oi.quantity),0)::int as "totalQuantity"
        FROM "OrderItem" oi
        INNER JOIN "Order" o ON o.id = oi."orderId"
        ${joinSql}
        ${whereSql}
        GROUP BY oi."productId"
        ORDER BY COALESCE(SUM(oi.quantity),0) DESC
        LIMIT 50
      `,
      values,
    ),
    pgQuery<Array<{ refunded_amount: number }>>(
      `
        SELECT COALESCE(SUM(r.amount),0)::numeric as refunded_amount
        FROM "RefundRecord" r
        INNER JOIN "Order" o ON o.id = r."orderId"
        ${joinSql}
        ${whereSql}
          AND r.status = 'completed'
      `,
      values,
    ).catch(() => [{ refunded_amount: 0 }]),
  ])

  const agg = aggRows[0] ?? { revenue_total: 0, subtotal_total: 0, order_count: 0 }
  const refundedAmount = Number(refundedRows[0]?.refunded_amount ?? 0)
  const revenueTotal = Number(agg.revenue_total ?? 0)
  const netSale = revenueTotal - refundedAmount

  const statusMap = new Map(
    byStatus.map((row) => [
      row.status,
      {
        status: row.status,
        count: row.count,
        revenue: Number((row as any).revenue ?? 0),
      },
    ]),
  )
  if (!statusMap.has("cancelled")) statusMap.set("cancelled", { status: "cancelled", count: 0, revenue: 0 })
  const formattedStatus = Array.from(statusMap.values())

  const productIds = productSummary.map((p) => p.productId)
  const products = productIds.length
    ? await pgQuery<Array<{ id: string; name: string }>>(`SELECT id, name FROM "Product" WHERE id = ANY($1::text[])`, [
        productIds,
      ])
    : []
  const productMap = new Map(products.map((p) => [p.id, p.name]))

  return {
    from,
    to,
    orderCount: Number(agg.order_count ?? 0),
    revenueTotal,
    subtotalTotal: Number(agg.subtotal_total ?? 0),
    refundedAmount,
    netSale,
    byStatus: formattedStatus,
    products: productSummary.map((row) => ({
      productId: row.productId,
      productName: productMap.get(row.productId) ?? "Unknown",
      totalQuantity: Number(row.totalQuantity ?? 0),
    })),
  }
};