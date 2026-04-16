import { prisma } from "@/src/server/db/prisma"
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
  return prisma.invoice.findUnique({
    where: { orderId },
  })
}

export const generateOrderInvoice = async (input: {
  orderId: string
  actorId: string
  gstin?: string
  taxRate?: number
}) => {
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: { items: true },
  })
  if (!order) throw new Error("Order not found")

  const existing = await prisma.invoice.findUnique({ where: { orderId: input.orderId } })
  if (existing) return existing

  const taxRate = input.taxRate ?? 0.18
  const taxableAmount = Number(order.subtotal)
  const taxAmount = Number((taxableAmount * taxRate).toFixed(2))
  const totalAmount = Number((taxableAmount + taxAmount + Number(order.shipping)).toFixed(2))

  const invoice = await prisma.invoice.create({
    data: {
      orderId: input.orderId,
      invoiceNo: makeInvoiceNo(),
      gstin: input.gstin?.trim() || null,
      taxableAmount,
      taxAmount,
      totalAmount,
      createdById: input.actorId,
    },
  })

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
