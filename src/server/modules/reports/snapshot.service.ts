import { pgQuery, pgTx } from "@/src/server/db/pg"
import { randomUUID } from "crypto"

const dayBounds = (date: Date) => {
  const from = new Date(date)
  from.setHours(0, 0, 0, 0)
  const to = new Date(from)
  to.setDate(to.getDate() + 1)
  return { from, to }
}

export const buildDailySnapshots = async (date: Date) => {
  const { from, to } = dayBounds(date)

  const [aggRows, itemsAgg, refundsAggRows, returnRequests] = await Promise.all([
    pgQuery<Array<{ order_count: number; total: number; subtotal: number; shipping: number }>>(
      `
        SELECT COUNT(*)::int as order_count,
               COALESCE(SUM(total),0)::numeric as total,
               COALESCE(SUM(subtotal),0)::numeric as subtotal,
               COALESCE(SUM(shipping),0)::numeric as shipping
        FROM "Order"
        WHERE "createdAt" >= $1 AND "createdAt" < $2
      `,
      [from, to],
    ),
    pgQuery<Array<{ productId: string; quantity: number; lineTotal: number }>>(
      `
        SELECT "productId" as "productId",
               COALESCE(SUM(quantity),0)::int as quantity,
               COALESCE(SUM("lineTotal"),0)::numeric as "lineTotal"
        FROM "OrderItem" oi
        INNER JOIN "Order" o ON o.id = oi."orderId"
        WHERE o."createdAt" >= $1 AND o."createdAt" < $2
        GROUP BY "productId"
      `,
      [from, to],
    ),
    pgQuery<Array<{ amount: number }>>(
      `
        SELECT COALESCE(SUM(amount),0)::numeric as amount
        FROM "RefundRecord"
        WHERE "createdAt" >= $1 AND "createdAt" < $2
          AND status NOT IN ('rejected','failed')
      `,
      [from, to],
    ),
    pgQuery<Array<{ orderId: string }>>(
      `
        SELECT "orderId" as "orderId"
        FROM "ReturnRequest"
        WHERE "createdAt" >= $1 AND "createdAt" < $2
          AND status NOT IN ('rejected','cancelled')
      `,
      [from, to],
    ).catch(() => []),
  ])

  const agg = aggRows[0] ?? { order_count: 0, total: 0, subtotal: 0, shipping: 0 }
  const refundsAgg = refundsAggRows[0] ?? { amount: 0 }
  const grossSales = Number(agg.subtotal ?? 0) + Number(agg.shipping ?? 0)
  const netSales = Number(agg.total ?? 0)
  const discountTotal = Math.max(0, grossSales - netSales)
  const refundTotal = Number(refundsAgg.amount ?? 0)

  const orderIdsWithReturn = [...new Set(returnRequests.map((r) => r.orderId))]
  const returnItems = orderIdsWithReturn.length
    ? await pgQuery<Array<{ productId: string; quantity: number }>>(
        `SELECT "productId" as "productId", quantity FROM "OrderItem" WHERE "orderId" = ANY($1::text[])`,
        [orderIdsWithReturn],
      )
    : []
  const returnsByProduct = new Map<string, number>()
  for (const item of returnItems) {
    returnsByProduct.set(item.productId, (returnsByProduct.get(item.productId) ?? 0) + item.quantity)
  }

  await pgTx(async (client) => {
    await client.query(`DELETE FROM "AnalyticsDailySalesSnapshot" WHERE "snapshotDate" = $1 AND region IS NULL`, [from])
    await client.query(
      `
        INSERT INTO "AnalyticsDailySalesSnapshot" (id, "snapshotDate", region, currency, "orderCount", "grossSales", "netSales", "discountTotal", "refundTotal", "createdAt", "updatedAt")
        VALUES ($1,$2,NULL,'INR',$3,$4::numeric,$5::numeric,$6::numeric,$7::numeric,now(),now())
      `,
      [randomUUID(), from, Number(agg.order_count ?? 0), grossSales, netSales, discountTotal, refundTotal],
    )

    await client.query(`DELETE FROM "AnalyticsDailyProductSnapshot" WHERE "snapshotDate" = $1`, [from])
    for (const row of itemsAgg) {
      await client.query(
        `
          INSERT INTO "AnalyticsDailyProductSnapshot" (id, "snapshotDate", "productId", "unitsSold", revenue, returns, "stockOnHand", "createdAt", "updatedAt")
          VALUES ($1,$2,$3,$4,$5::numeric,$6,$7,now(),now())
        `,
        [
          randomUUID(),
          from,
          row.productId,
          Number(row.quantity ?? 0),
          Number((row as any).lineTotal ?? 0),
          returnsByProduct.get(row.productId) ?? 0,
          0,
        ],
      )
    }

    await client.query(
      `
        INSERT INTO "AnalyticsJobRun" (id, "jobKey", status, "lastSuccessAt", watermark, "createdAt", "updatedAt", "errorMessage")
        VALUES ($1,'daily_snapshots','success',now(),$2,now(),now(),NULL)
        ON CONFLICT ("jobKey") DO UPDATE
        SET status='success', "lastSuccessAt"=now(), watermark=EXCLUDED.watermark, "errorMessage"=NULL, "updatedAt"=now()
      `,
      [randomUUID(), from.toISOString()],
    )
  })

  return {
    snapshotDate: from.toISOString(),
    orderCount: Number(agg.order_count ?? 0),
    products: itemsAgg.length,
    grossSales,
    netSales,
    refundTotal,
  }
}
