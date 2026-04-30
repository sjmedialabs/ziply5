import { pgQuery } from "@/src/server/db/pg"
import { randomUUID } from "crypto"
import { enqueueOutboxEvent } from "@/src/server/modules/integrations/outbox.service"

const makeInvoiceNo = () => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `INV-${y}${m}${day}-${rand}`
}

export const getOrderInvoice = async (orderId: string) => {
  const rows = await pgQuery(`SELECT * FROM "Invoice" WHERE "orderId" = $1 LIMIT 1`, [orderId])
  return rows[0] ?? null
}

export const generateOrderInvoice = async (input: {
  orderId: string
  actorId: string
  gstin?: string
  taxRate?: number
}) => {
  const orderRows = await pgQuery<Array<{ id: string; subtotal: any; shipping: any }>>(
    `SELECT id, subtotal, shipping FROM "Order" WHERE id = $1 LIMIT 1`,
    [input.orderId],
  )
  const order = orderRows[0]
  if (!order) throw new Error("Order not found")

  const existingRows = await pgQuery(`SELECT * FROM "Invoice" WHERE "orderId" = $1 LIMIT 1`, [input.orderId])
  const existing = existingRows[0]
  if (existing) return existing

  const taxRate = input.taxRate ?? 0.18
  const taxableAmount = Number(order.subtotal)
  const taxAmount = Number((taxableAmount * taxRate).toFixed(2))
  const totalAmount = Number((taxableAmount + taxAmount + Number(order.shipping)).toFixed(2))

  const invoiceRows = await pgQuery(
    `
      INSERT INTO "Invoice" (id, "orderId", "invoiceNo", gstin, "taxableAmount", "taxAmount", "totalAmount", "generatedAt", "createdById")
      VALUES ($1,$2,$3,$4,$5::numeric,$6::numeric,$7::numeric, now(), $8)
      RETURNING *
    `,
    [randomUUID(), input.orderId, makeInvoiceNo(), input.gstin?.trim() || null, taxableAmount, taxAmount, totalAmount, input.actorId],
  )
  const invoice = invoiceRows[0]

  await enqueueOutboxEvent({
    eventType: "invoice.generated",
    aggregateType: "order",
    aggregateId: input.orderId,
    payload: {
      orderId: input.orderId,
      invoiceId: invoice.id,
      invoiceNo: invoice.invoiceNo,
      totalAmount: invoice.totalAmount,
    },
  }).catch(() => null)

  return invoice
}
