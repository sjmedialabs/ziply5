import type { Prisma } from "@prisma/client"
import { prisma } from "@/src/server/db/prisma"
import { computeCouponDiscount } from "@/src/server/modules/coupons/coupons.service"
import { logActivity } from "@/src/server/modules/activity/activity.service"
import { emailTemplates, enqueueEmail } from "@/src/server/modules/notifications/email.service"

export const createOrderFromCheckout = async (input: {
  items: { slug: string; quantity: number }[]
  userId?: string | null
  shipping?: number
  currency?: string
  couponCode?: string
  gateway: string
}) => {
  const shipping = input.shipping ?? 0
  const slugs = [...new Set(input.items.map((i) => i.slug))]
  const products = await prisma.product.findMany({
    where: { slug: { in: slugs }, status: "published" },
  })
  const bySlug = Object.fromEntries(products.map((p) => [p.slug, p]))

  let subtotal = 0
  const lines: { productId: string; quantity: number; unitPrice: number; lineTotal: number }[] = []

  for (const line of input.items) {
    const p = bySlug[line.slug]
    if (!p) throw new Error(`Product not available: ${line.slug}`)
    const unit = Number(p.price)
    const lineTotal = unit * line.quantity
    lines.push({
      productId: p.id,
      quantity: line.quantity,
      unitPrice: unit,
      lineTotal,
    })
    subtotal += lineTotal
  }

  let discount = 0
  if (input.couponCode?.trim()) {
    const applied = await computeCouponDiscount(input.couponCode, subtotal)
    discount = applied.discount
  }

  const total = Math.max(subtotal + shipping - discount, 0)

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        userId: input.userId ?? undefined,
        status: "pending",
        currency: input.currency ?? "INR",
        subtotal,
        shipping,
        total,
        items: {
          create: lines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            lineTotal: l.lineTotal,
          })),
        },
      },
      include: {
        items: { include: { product: { select: { id: true, name: true, slug: true } } } },
      },
    })

    await tx.transaction.create({
      data: {
        orderId: created.id,
        gateway: input.gateway,
        amount: total,
        status: "pending",
      },
    })

    return created
  })

  await logActivity({
    actorId: input.userId ?? undefined,
    action: "order.create",
    entityType: "Order",
    entityId: order.id,
    metadata: { itemCount: lines.length, total },
  })

  if (input.userId) {
    const user = await prisma.user.findUnique({ where: { id: input.userId }, select: { email: true } })
    if (user?.email) {
      try {
        const mail = emailTemplates.orderPlaced(order.id)
        await enqueueEmail({ to: user.email, ...mail })
      } catch {
        // Non-blocking side effect
      }
    }
  }

  return order
}

export const listOrders = async (
  page: number,
  limit: number,
  role: string,
  userId: string,
) => {
  const skip = (page - 1) * limit
  const where: Prisma.OrderWhereInput = {}
  if (role === "seller") {
    where.items = { some: { product: { sellerId: userId } } }
  } else if (role === "customer") {
    where.userId = userId
  }

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        items: { include: { product: { select: { id: true, name: true, slug: true, sellerId: true } } } },
        transactions: true,
      },
    }),
    prisma.order.count({ where }),
  ])

  return { items, total, page, limit }
}

export const getOrderById = async (id: string) => {
  return prisma.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: true } },
      transactions: true,
    },
  })
}

export const getOrderForActor = async (id: string, role: string, userId: string) => {
  const order = await getOrderById(id)
  if (!order) return null
  if (role === "admin" || role === "super_admin") return order
  if (role === "customer" && order.userId === userId) return order
  if (role === "seller") {
    const touches = order.items.some((i) => i.product.sellerId === userId)
    return touches ? order : null
  }
  return null
}

export const updateOrderStatus = async (
  id: string,
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled",
  actorId: string,
) => {
  const order = await prisma.order.update({
    where: { id },
    data: { status },
    include: {
      items: { include: { product: true } },
      transactions: true,
    },
  })

  await logActivity({
    actorId,
    action: "order.status",
    entityType: "Order",
    entityId: id,
    metadata: { status },
  })

  if (order.userId) {
    const user = await prisma.user.findUnique({ where: { id: order.userId }, select: { email: true } })
    if (user?.email) {
      try {
        const mail = emailTemplates.orderStatus(id, status)
        await enqueueEmail({ to: user.email, ...mail })
      } catch {
        // Non-blocking side effect
      }
    }
  }

  return order
}

