import { prisma } from "@/src/server/db/prisma"
import type { Prisma, ProductStatus } from "@prisma/client"
import { logActivity } from "@/src/server/modules/activity/activity.service"

export type ListProductsScope = "public" | "admin" | "seller"

type CreateProductInput = {
  name: string
  slug: string
  sku: string
  price: number
  description?: string
  status?: "draft" | "published" | "archived"
  sellerId?: string | null
}

type UpdateProductInput = Partial<{
  name: string
  slug: string
  sku: string
  price: number
  description: string | null
  status: "draft" | "published" | "archived"
  sellerId: string | null
}>

const productInclude = {
  images: true,
  brand: true,
  seller: { select: { id: true, name: true, email: true } },
  categories: { include: { category: true } },
  variants: true,
} as const

export const listProducts = async (
  page = 1,
  limit = 20,
  scope: ListProductsScope,
  sellerUserId: string | undefined,
  filters?: { status?: string; q?: string },
) => {
  const skip = (page - 1) * limit
  const where: Prisma.ProductWhereInput = {}

  if (scope === "public") {
    where.status = "published"
  } else if (scope === "seller" && sellerUserId) {
    where.sellerId = sellerUserId
  } else if (scope === "admin" && filters?.status) {
    where.status = filters.status as ProductStatus
  }

  if (filters?.q?.trim()) {
    const q = filters.q.trim()
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { slug: { contains: q, mode: "insensitive" } },
      { sku: { contains: q, mode: "insensitive" } },
    ]
  }

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: productInclude,
    }),
    prisma.product.count({ where }),
  ])

  return { items, total, page, limit }
}

export const getProductById = async (id: string) => {
  return prisma.product.findUnique({
    where: { id },
    include: productInclude,
  })
}

export const canAccessProduct = (
  product: { status: string; sellerId: string | null },
  scope: ListProductsScope,
  sellerUserId?: string,
) => {
  if (scope === "admin") return true
  if (product.status === "published") return true
  if (scope === "seller" && sellerUserId && product.sellerId === sellerUserId) return true
  return false
}

export const createProduct = async (input: CreateProductInput) => {
  return prisma.product.create({
    data: {
      sellerId: input.sellerId ?? undefined,
      name: input.name,
      slug: input.slug,
      sku: input.sku,
      price: input.price,
      description: input.description,
      status: input.status ?? "draft",
    },
    include: productInclude,
  })
}

export const updateProduct = async (
  id: string,
  input: UpdateProductInput,
  opts: { role: string; userId: string },
) => {
  const existing = await prisma.product.findUnique({ where: { id } })
  if (!existing) throw new Error("Product not found")

  const isAdmin = opts.role === "admin" || opts.role === "super_admin"
  if (!isAdmin && existing.sellerId !== opts.userId) {
    throw new Error("Forbidden")
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
      ...("name" in input && input.name !== undefined ? { name: input.name } : {}),
      ...("slug" in input && input.slug !== undefined ? { slug: input.slug } : {}),
      ...("sku" in input && input.sku !== undefined ? { sku: input.sku } : {}),
      ...("price" in input && input.price !== undefined ? { price: input.price } : {}),
      ...("description" in input ? { description: input.description } : {}),
      ...("status" in input && input.status !== undefined ? { status: input.status } : {}),
      ...("sellerId" in input && input.sellerId !== undefined && isAdmin ? { sellerId: input.sellerId } : {}),
    },
    include: productInclude,
  })

  await logActivity({
    actorId: opts.userId,
    action: "product.update",
    entityType: "Product",
    entityId: id,
    metadata: { fields: Object.keys(input) },
  })

  return product
}

export const deleteProduct = async (id: string, opts: { role: string; userId: string }) => {
  const existing = await prisma.product.findUnique({ where: { id } })
  if (!existing) throw new Error("Product not found")

  const isAdmin = opts.role === "admin" || opts.role === "super_admin"
  if (!isAdmin && existing.sellerId !== opts.userId) {
    throw new Error("Forbidden")
  }

  await prisma.product.delete({ where: { id } })

  await logActivity({
    actorId: opts.userId,
    action: "product.delete",
    entityType: "Product",
    entityId: id,
  })

  return { id }
}
