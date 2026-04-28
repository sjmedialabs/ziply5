import crypto from "node:crypto"
import Stripe from "stripe"
import { prisma } from "@/src/server/db/prisma"
import { env } from "@/src/server/core/config/env"
import { isAutoApproveOrdersEnabled, updateOrderStatus } from "@/src/server/modules/orders/orders.service"
import {
  completePendingRefundRecordsSupabase,
  markOrderPaymentSuccessSupabase,
  mirrorOrderStatusSupabase,
  setOrderRefundAndPaymentStatusSupabase,
  setTransactionRefundIdSupabase,
  upsertPendingTransactionSupabase,
  updateTransactionStatusSupabase,
  updateRefundRecordStatusSupabase,
  upsertPaidTransactionSupabase,
} from "@/src/lib/db/orders"
import { logger } from "@/lib/logger"

export type PaymentProvider = "razorpay" | "stripe" | "mock"

const normalizeProvider = (provider?: string): PaymentProvider => {
  const p = (provider ?? env.PAYMENT_PROVIDER_DEFAULT ?? "mock").toLowerCase()
  if (p === "razorpay" || p === "stripe" || p === "mock") return p
  return "mock"
}

const randomId = (prefix: string) => `${prefix}_${crypto.randomBytes(10).toString("hex")}`

const amountToMinor = (amount: number) => Math.max(0, Math.round(amount * 100))

const stripeClient = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2025-08-27.basil" })
  : null
const prismaFallbackEnabled = process.env.PRISMA_FALLBACK_ENABLED === "true"

const upsertTransaction = async (
  orderId: string,
  provider: PaymentProvider,
  externalId: string,
  amount: number,
) => {
  const useSupabaseWrites = process.env.SUPABASE_ORDERS_WRITE_ENABLED === "true"
  if (useSupabaseWrites) {
    try {
      const txId = await upsertPendingTransactionSupabase({
        orderId,
        gateway: provider,
        externalId,
        amount,
      })
      if (txId) return txId
    } catch (error) {
      logger.warn("payments.intent_transaction.supabase_fallback_prisma", {
        orderId,
        provider,
        error: error instanceof Error ? error.message : "unknown",
      })
    }
  }
  if (!prismaFallbackEnabled) {
    throw new Error("Supabase transaction upsert failed and Prisma fallback is disabled")
  }

  const existing = await prisma.transaction.findFirst({
    where: { orderId, gateway: provider },
    orderBy: { createdAt: "desc" },
  })
  if (existing) {
    await prisma.$executeRawUnsafe(
      'UPDATE "Transaction" SET "externalId" = $1, status = $2, amount = $3, gateway = $4 WHERE id = $5',
      externalId,
      "pending",
      amount,
      provider,
      existing.id,
    )
    return existing.id
  }
  const created = await prisma.transaction.create({
    data: {
      orderId,
      gateway: provider,
      amount,
      status: "pending",
      externalId,
    },
  })
  return created.id
}

const createRazorpayOrder = async (input: { orderId: string; amount: number; currency: string }) => {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay keys are not configured")
  }
  const auth = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64")
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: amountToMinor(input.amount),
      currency: input.currency,
      receipt: input.orderId,
      notes: { orderId: input.orderId },
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Razorpay order creation failed: ${res.status} ${text.slice(0, 160)}`)
  }
  const json = (await res.json()) as { id: string }
  return json.id
}

const createStripeIntent = async (input: { orderId: string; amount: number; currency: string }) => {
  if (!stripeClient) throw new Error("Stripe secret key is not configured")
  const intent = await stripeClient.paymentIntents.create({
    amount: amountToMinor(input.amount),
    currency: input.currency.toLowerCase(),
    metadata: { orderId: input.orderId },
  })
  return {
    id: intent.id,
    clientSecret: intent.client_secret ?? undefined,
  }
}

export const createPaymentIntent = async (input: {
  orderId: string
  provider?: string
  actorRole: string
  actorUserId: string
}) => {
  const provider = normalizeProvider(input.provider)
  const order = await prisma.order.findUnique({ where: { id: input.orderId } })
  if (!order) throw new Error("Order not found")
  if (input.actorRole === "customer" && order.userId && order.userId !== input.actorUserId) {
    throw new Error("Forbidden")
  }

  const amount = Number(order.total)
  let externalId = randomId(provider)
  let clientSecret: string | undefined

  if (provider === "razorpay") {
    externalId = await createRazorpayOrder({ orderId: input.orderId, amount, currency: order.currency })
  } else if (provider === "stripe") {
    const stripe = await createStripeIntent({ orderId: input.orderId, amount, currency: order.currency })
    externalId = stripe.id
    clientSecret = stripe.clientSecret
  }

  await upsertTransaction(input.orderId, provider, externalId, amount)
  const useSupabaseWrites = process.env.SUPABASE_ORDERS_WRITE_ENABLED === "true"
  if (useSupabaseWrites) {
    setOrderRefundAndPaymentStatusSupabase({
      orderId: input.orderId,
      paymentStatus: "PENDING",
    }).catch(() => null)
  } else {
    if (!prismaFallbackEnabled) {
      throw new Error("SUPABASE_ORDERS_WRITE_ENABLED must be true when Prisma fallback is disabled")
    }
    await prisma.order.update({
      where: { id: input.orderId },
      data: {
        paymentStatus: toPaymentStatus("PENDING"),
      },
    }).catch(() => null)
  }

  return {
    provider,
    orderId: input.orderId,
    amount,
    currency: order.currency,
    externalId,
    clientSecret,
    publicKey: provider === "razorpay" ? env.RAZORPAY_KEY_ID : undefined,
    status: "pending",
  }
}

const constantTimeEqual = (a: string, b: string) => {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return crypto.timingSafeEqual(ab, bb)
}

const toPaymentStatus = (status: "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED") => status

const isMissingTransactionInfraError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  return /Transaction|transactions?|does not exist|P2021|P2022/i.test(message)
}

export const verifyRazorpayCheckoutSignature = (input: {
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
}) => {
  if (!env.RAZORPAY_KEY_SECRET) throw new Error("Razorpay key secret is not configured")
  const payload = `${input.razorpayOrderId}|${input.razorpayPaymentId}`
  const expected = crypto.createHmac("sha256", env.RAZORPAY_KEY_SECRET).update(payload).digest("hex")
  return constantTimeEqual(expected, input.razorpaySignature)
}

export const verifyRazorpayPayment = async (input: {
  orderId: string
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
}) => {
  const valid = verifyRazorpayCheckoutSignature(input)
  if (!valid) throw new Error("Invalid Razorpay signature")

  let txId: string | null = null
  const supabaseWritesEnabled = process.env.SUPABASE_ORDERS_WRITE_ENABLED === "true"
  let supabasePersisted = false
  if (supabaseWritesEnabled) {
    try {
      txId = await upsertPaidTransactionSupabase({
        orderId: input.orderId,
        razorpayOrderId: input.razorpayOrderId,
        razorpayPaymentId: input.razorpayPaymentId,
      })
      const mirrored = await markOrderPaymentSuccessSupabase(input.orderId, input.razorpayPaymentId)
      if (!mirrored) {
        logger.warn("payments.verify.supabase_order_update_noop", { orderId: input.orderId })
      } else {
        supabasePersisted = true
      }
    } catch (error) {
      logger.warn("payments.verify.supabase_fallback_prisma", {
        orderId: input.orderId,
        error: error instanceof Error ? error.message : "unknown",
      })
    }
  }

  if (!supabasePersisted) {
    if (!prismaFallbackEnabled) {
      throw new Error("Supabase verify payment persistence failed and Prisma fallback is disabled")
    }
    try {
      const tx = await prisma.transaction.findFirst({
        where: {
          orderId: input.orderId,
          OR: [
            { externalId: input.razorpayOrderId },
            { externalId: input.razorpayPaymentId },
          ],
        },
        orderBy: { createdAt: "desc" },
      })

      if (tx?.status === "paid") {
        txId = tx.id
      } else if (tx) {
        await prisma.$executeRawUnsafe(
          'UPDATE "Transaction" SET status = $1, "externalId" = $2 WHERE id = $3',
          "paid",
          input.razorpayPaymentId,
          tx.id,
        )
        txId = tx.id
      } else {
        const created = await prisma.transaction.create({
          data: {
            orderId: input.orderId,
            gateway: "razorpay",
            amount: 0,
            status: "paid",
            externalId: input.razorpayPaymentId,
          },
        })
        txId = created.id
      }
    } catch (error) {
      if (!isMissingTransactionInfraError(error)) throw error
      // Schema drift: transaction table may be unavailable; continue with order payment update.
    }

    await prisma.order.update({
      where: { id: input.orderId },
      data: {
        paymentStatus: toPaymentStatus("SUCCESS"),
        paymentId: input.razorpayPaymentId,
      },
    })
  }

  await updateOrderStatus(input.orderId, "payment_success", undefined, {
    reasonCode: "payment_success",
    note: "Razorpay payment signature verified",
  }).catch(() => null)
  await updateOrderStatus(input.orderId, "confirmed", undefined, {
    reasonCode: "payment_success",
    note: "Order confirmed after successful payment",
  }).catch(() => null)
  if (supabaseWritesEnabled) {
    await mirrorOrderStatusSupabase(input.orderId, "confirmed").catch(() => null)
  }
  if (!supabaseWritesEnabled || prismaFallbackEnabled) {
    await prisma.order.update({
      where: { id: input.orderId },
      data: { status: "confirmed" },
    }).catch(() => null)
  }

  return { verified: true, orderId: input.orderId, transactionId: txId }
}

export const triggerRazorpayRefund = async (input: {
  refundRecordId: string
}) => {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay keys are not configured")
  }
  const refund = await prisma.refundRecord.findUnique({
    where: { id: input.refundRecordId },
    include: { order: true },
  })
  if (!refund) throw new Error("Refund record not found")
  if (!refund.order.paymentId) throw new Error("Order has no Razorpay payment_id")
  if (["initiated", "completed"].includes(refund.status)) throw new Error("Refund already initiated")

  const amount = Math.max(1, Math.round(Number(refund.amount) * 100))
  const auth = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64")
  const res = await fetch(`https://api.razorpay.com/v1/payments/${refund.order.paymentId}/refund`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount,
      notes: { refundRecordId: refund.id, orderId: refund.orderId },
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Razorpay refund failed: ${res.status} ${text.slice(0, 180)}`)
  }

  const payload = (await res.json()) as { id?: string }
  const refundId = payload.id ?? null

  const useSupabaseWrites = process.env.SUPABASE_ORDERS_WRITE_ENABLED === "true"
  let persisted = false
  if (useSupabaseWrites) {
    try {
      const refundUpdated = await updateRefundRecordStatusSupabase(refund.id, "initiated")
      if (!refundUpdated) throw new Error("supabase_refund_record_write_failed")
      const orderUpdated = await setOrderRefundAndPaymentStatusSupabase({
        orderId: refund.orderId,
        refundStatus: "INITIATED",
        paymentStatus: "REFUNDED",
      })
      if (!orderUpdated) throw new Error("supabase_order_refund_status_write_failed")
      if (refundId) {
        await setTransactionRefundIdSupabase(refund.orderId, refundId).catch(() => null)
      }
      persisted = true
    } catch (error) {
      logger.warn("payments.refund.supabase_fallback_prisma", {
        orderId: refund.orderId,
        refundRecordId: refund.id,
        error: error instanceof Error ? error.message : "unknown",
      })
    }
  }
  if (!persisted) {
    if (!prismaFallbackEnabled) {
      throw new Error("Supabase refund persistence failed and Prisma fallback is disabled")
    }
    await prisma.$transaction(async (db) => {
      await db.refundRecord.update({
        where: { id: refund.id },
        data: { status: "initiated" },
      })
      await db.$executeRawUnsafe('UPDATE "Order" SET "refundStatus" = $1 WHERE id = $2', "INITIATED", refund.orderId)
      if (refundId) {
        await db.$executeRawUnsafe(
          'UPDATE "Transaction" SET "refundId" = $1 WHERE "orderId" = $2',
          refundId,
          refund.orderId,
        )
      }
      await db.order.update({
        where: { id: refund.orderId },
        data: { paymentStatus: toPaymentStatus("REFUNDED") },
      })
    })
  }

  return { refundId, refundRecordId: refund.id, status: "initiated" as const }
}

export const parseAndVerifyWebhook = (input: {
  providerRaw: string
  payload: string
  signature: string | null
}) => {
  const provider = normalizeProvider(input.providerRaw)
  if (provider === "stripe") {
    if (!stripeClient) throw new Error("Stripe secret key is not configured")
    if (!input.signature) throw new Error("Missing stripe signature")
    if (!env.PAYMENT_WEBHOOK_SECRET) throw new Error("Missing PAYMENT_WEBHOOK_SECRET")
    return stripeClient.webhooks.constructEvent(input.payload, input.signature, env.PAYMENT_WEBHOOK_SECRET)
  }
  if (provider === "razorpay") {
    if (!input.signature) throw new Error("Missing razorpay signature")
    if (!env.PAYMENT_WEBHOOK_SECRET) throw new Error("Missing PAYMENT_WEBHOOK_SECRET")
    const expected = crypto.createHmac("sha256", env.PAYMENT_WEBHOOK_SECRET).update(input.payload).digest("hex")
    if (!constantTimeEqual(expected, input.signature)) throw new Error("Invalid signature")
    return JSON.parse(input.payload) as unknown
  }
  return JSON.parse(input.payload) as unknown
}

export const processWebhookEvent = async (
  providerRaw: string,
  event: unknown,
  externalIdHint?: string | null,
) => {
  const provider = normalizeProvider(providerRaw)
  const obj = event as Record<string, unknown>
  const type = String(obj.type ?? obj.event ?? "")

  let orderId: string | null = null
  let externalId: string | null = externalIdHint ?? null
  let paid = false

  if (provider === "razorpay") {
    const payload = obj.payload as Record<string, unknown> | undefined
    const payment = payload?.payment as Record<string, unknown> | undefined
    const refund = payload?.refund as Record<string, unknown> | undefined
    const entity = (payment?.entity ?? payload?.entity ?? {}) as Record<string, unknown>
    const refundEntity = (refund?.entity ?? {}) as Record<string, unknown>
    const notes = (entity.notes ?? {}) as Record<string, unknown>
    orderId = typeof notes.orderId === "string" ? notes.orderId : null
    externalId = externalId ?? (typeof entity.order_id === "string" ? entity.order_id : null)
    if (!orderId && typeof refundEntity.payment_id === "string") {
      const orderByPayment = await prisma.order.findFirst({
        where: { paymentId: refundEntity.payment_id },
        select: { id: true },
      })
      orderId = orderByPayment?.id ?? null
    }
    paid = type.includes("captured") || type.includes("paid")
  } else if (provider === "stripe") {
    const data = obj.data as Record<string, unknown> | undefined
    const object = (data?.object ?? {}) as Record<string, unknown>
    const metadata = (object.metadata ?? {}) as Record<string, unknown>
    orderId = typeof metadata.orderId === "string" ? metadata.orderId : null
    externalId = externalId ?? (typeof object.id === "string" ? object.id : null)
    paid = type === "payment_intent.succeeded" || type.includes("checkout.session.completed")
  } else {
    const meta = obj as Record<string, unknown>
    orderId = typeof meta.orderId === "string" ? meta.orderId : null
    externalId = externalId ?? (typeof meta.externalId === "string" ? meta.externalId : null)
    paid = meta.status === "paid"
  }

  if (!orderId) return { applied: false, reason: "orderId_missing" }
  const tx = await prisma.transaction.findFirst({
    where: {
      orderId,
      ...(externalId ? { externalId } : {}),
    },
    orderBy: { createdAt: "desc" },
  })
  if (!tx) return { applied: false, reason: "transaction_not_found" }

  const nextTxStatus =
    type === "refund.processed" ? "refunded" : type === "payment.failed" ? "failed" : paid ? "paid" : "failed"
  if (tx.status === nextTxStatus) {
    return { applied: true, duplicate: true, paid, orderId, transactionId: tx.id }
  }

  const useSupabaseWrites = process.env.SUPABASE_ORDERS_WRITE_ENABLED === "true"
  let persisted = false
  if (useSupabaseWrites) {
    try {
      const txUpdated = await updateTransactionStatusSupabase({
        transactionId: tx.id,
        status: nextTxStatus,
        gateway: provider,
        externalId: externalId ?? tx.externalId ?? undefined,
      })
      if (!txUpdated) throw new Error("supabase_transaction_status_write_failed")
      const orderUpdated = await setOrderRefundAndPaymentStatusSupabase({
        orderId,
        paymentStatus: type === "refund.processed" ? "REFUNDED" : paid ? "SUCCESS" : "FAILED",
        refundStatus: type === "refund.processed" ? "COMPLETED" : undefined,
      })
      if (!orderUpdated) throw new Error("supabase_order_payment_status_write_failed")
      if (type === "refund.processed") {
        await completePendingRefundRecordsSupabase(orderId).catch(() => null)
      }
      persisted = true
    } catch (error) {
      logger.warn("payments.webhook.supabase_fallback_prisma", {
        orderId,
        transactionId: tx.id,
        error: error instanceof Error ? error.message : "unknown",
      })
    }
  }
  if (!persisted) {
    if (!prismaFallbackEnabled) {
      throw new Error("Supabase webhook persistence failed and Prisma fallback is disabled")
    }
    await prisma.$transaction(async (db) => {
      await db.transaction.update({
        where: { id: tx.id },
        data: {
          status: nextTxStatus,
          gateway: provider,
          externalId: externalId ?? tx.externalId ?? undefined,
        },
      })
      await db.order.update({
        where: { id: orderId },
        data: {
          paymentStatus:
            type === "refund.processed"
              ? toPaymentStatus("REFUNDED")
              : paid
                ? toPaymentStatus("SUCCESS")
                : toPaymentStatus("FAILED"),
        },
      })
      if (type === "refund.processed") {
        await db.refundRecord.updateMany({
          where: {
            orderId,
            status: { in: ["pending", "initiated", "processing"] },
          },
          data: { status: "completed" },
        })
        await db.$executeRawUnsafe('UPDATE "Order" SET "refundStatus" = $1 WHERE id = $2', "COMPLETED", orderId)
      }
    })
  }
  if (paid) {
    await updateOrderStatus(orderId, "payment_success", undefined, {
      reasonCode: "webhook_payment_captured",
      note: "Payment captured by webhook",
    }).catch(() => null)
    await updateOrderStatus(orderId, "admin_approval_pending", undefined, {
      reasonCode: "webhook_payment_captured",
      note: "Awaiting admin approval",
    }).catch(() => null)
    if (await isAutoApproveOrdersEnabled()) {
      await updateOrderStatus(orderId, "confirmed", undefined, {
        reasonCode: "auto_approve_orders",
        note: "Order auto-approved by setting",
      }).catch(() => null)
    }
  } else if (type === "payment.failed") {
    await updateOrderStatus(orderId, "failed", undefined, {
      reasonCode: "payment_failed",
      note: "Payment failed via webhook",
    }).catch(() => null)
  }
  return { applied: true, paid, orderId, transactionId: tx.id }
}
