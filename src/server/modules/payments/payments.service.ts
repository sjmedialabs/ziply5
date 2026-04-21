import crypto from "node:crypto"
import Stripe from "stripe"
import { prisma } from "@/src/server/db/prisma"
import { env } from "@/src/server/core/config/env"

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

const upsertTransaction = async (
  orderId: string,
  provider: PaymentProvider,
  externalId: string,
  amount: number,
) => {
  const existing = await prisma.transaction.findFirst({
    where: { orderId, gateway: provider },
    orderBy: { createdAt: "desc" },
  })
  if (existing) {
    return prisma.transaction.update({
      where: { id: existing.id },
      data: { externalId, status: "pending", amount, gateway: provider },
    })
  }
  return prisma.transaction.create({
    data: {
      orderId,
      gateway: provider,
      amount,
      status: "pending",
      externalId,
    },
  })
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
    const entity = (payment?.entity ?? payload?.entity ?? {}) as Record<string, unknown>
    const notes = (entity.notes ?? {}) as Record<string, unknown>
    orderId = typeof notes.orderId === "string" ? notes.orderId : null
    externalId = externalId ?? (typeof entity.order_id === "string" ? entity.order_id : null)
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

  const nextTxStatus = paid ? "paid" : "failed"
  if (tx.status === nextTxStatus) {
    return { applied: true, duplicate: true, paid, orderId, transactionId: tx.id }
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
      data: { status: paid ? "confirmed" : "pending" },
    })
  })
  return { applied: true, paid, orderId, transactionId: tx.id }
}
