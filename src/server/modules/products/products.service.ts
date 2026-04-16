import { prisma } from "@/src/server/db/prisma"
import type { Prisma, ProductStatus } from "@prisma/client"
import { logActivity } from "@/src/server/modules/activity/activity.service"
import sanitizeHtml from "sanitize-html"

export type ListProductsScope = "public" | "admin"

type CreateProductInput = {
  name: string
  slug: string
  sku: string
  price: number
  description?: string
  type?: "simple" | "variant"
  basePrice?: number | null
  salePrice?: number | null
  discountPercent?: number | null
  taxIncluded?: boolean
  stockStatus?: "in_stock" | "out_of_stock"
  totalStock?: number
  shelfLife?: string | null
  isActive?: boolean
  isFeatured?: boolean
  isBestSeller?: boolean
  thumbnail?: string | null
  metaTitle?: string | null
  metaDescription?: string | null
  status?: "draft" | "published" | "archived"
  createdById?: string | null
  managedById?: string | null
  categoryId?: string | null
  brandId?: string | null
  variants?: Array<{
    name: string
    weight?: string | null
    price: number
    mrp?: number | null
    discountPercent?: number | null
    stock?: number
    sku: string
    isDefault?: boolean
  }>
  images?: string[]
  features?: Array<{ title: string; icon?: string | null }>
  tags?: string[]
  labels?: Array<{ label: string; color?: string | null }>
  details?: Array<{ title: string; content: string; sortOrder?: number }>
  sections?: Array<{ title: string; description: string; sortOrder?: number; isActive?: boolean }>
}

type UpdateProductInput = Partial<{
  name: string
  slug: string
  sku: string
  price: number
  description: string | null
  type: "simple" | "variant"
  basePrice: number | null
  salePrice: number | null
  discountPercent: number | null
  taxIncluded: boolean
  stockStatus: "in_stock" | "out_of_stock"
  totalStock: number
  shelfLife: string | null
  isActive: boolean
  isFeatured: boolean
  isBestSeller: boolean
  thumbnail: string | null
  metaTitle: string | null
  metaDescription: string | null
  status: "draft" | "published" | "archived"
  categoryId: string | null
  brandId: string | null
  variants: Array<{
    name: string
    weight?: string | null
    price: number
    mrp?: number | null
    discountPercent?: number | null
    stock?: number
    sku: string
    isDefault?: boolean
  }>
  images: string[]
  features: Array<{ title: string; icon?: string | null }>
  tags: string[]
  labels: Array<{ label: string; color?: string | null }>
  details: Array<{ title: string; content: string; sortOrder?: number }>
  sections: Array<{ id?: string; title: string; description: string; sortOrder?: number; isActive?: boolean }>
}>

const productSelect = {
  id: true,
  createdById: true,
  managedById: true,
  brandId: true,
  name: true,
  slug: true,
  description: true,
  type: true,
  basePrice: true,
  salePrice: true,
  discountPercent: true,
  taxIncluded: true,
  stockStatus: true,
  totalStock: true,
  shelfLife: true,
  isActive: true,
  isFeatured: true,
  isBestSeller: true,
  thumbnail: true,
  metaTitle: true,
  metaDescription: true,
  status: true,
  sku: true,
  price: true,
  createdAt: true,
  updatedAt: true,
  images: true,
  features: true,
  labels: true,
  details: { orderBy: { sortOrder: "asc" as const } },
  sections: { orderBy: { sortOrder: "asc" as const } },
  brand: true,
  categories: { include: { category: true }, take: 1 },
  tags: { include: { tag: true } },
  variants: true,
} as const

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

const sanitizeSectionHtml = (value: string) =>
  sanitizeHtml(value, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "ul",
      "ol",
      "li",
      "span",
      "a",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "blockquote",
      "code",
      "pre",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      span: ["class"],
      p: ["class"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
  }).trim()

const normalizeSections = (
  input: Pick<CreateProductInput, "sections" | "details">,
): Array<{ title: string; description: string; sortOrder: number; isActive: boolean }> => {
  if (input.sections?.length) {
    return input.sections
      .map((s, idx) => ({
        title: s.title.trim(),
        description: sanitizeSectionHtml(s.description),
        sortOrder: s.sortOrder ?? idx,
        isActive: s.isActive ?? true,
      }))
      .filter((s) => s.title && s.description)
      .slice(0, 10)
  }
  if (input.details?.length) {
    return input.details
      .map((d, idx) => ({
        title: d.title.trim(),
        description: sanitizeSectionHtml(d.content),
        sortOrder: d.sortOrder ?? idx,
        isActive: true,
      }))
      .filter((s) => s.title && s.description)
      .slice(0, 10)
  }
  return []
}

export const listProducts = async (
  page = 1,
  limit = 20,
  scope: ListProductsScope,
  filters?: { status?: string; q?: string },
) => {
  const skip = (page - 1) * limit
  const where: Prisma.ProductWhereInput = {}

  if (scope === "public") {
    where.status = "published"
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

  // const [items, total] = await Promise.all([
  //   prisma.product.findMany({
  //     where,
  //     orderBy: { createdAt: "desc" },
  //     skip,
  //     take: limit,
  //     select: productSelect,
  //   }),
  //   prisma.product.count({ where }),
  // ])
  const items = await prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: productSelect,
    })
const total = await prisma.product.count({ where })

  return { items, total, page, limit }
}

export const getProductById = async (id: string) => {
  return prisma.product.findUnique({
    where: { id },
    select: productSelect,
  })
}

export const getProductBySlug = async (slug: string) => {
  return prisma.product.findUnique({
    where: { slug },
    select: productSelect,
  })
}

export const canAccessProduct = (
  product: { status: string },
  scope: ListProductsScope,
) => {
  if (scope === "admin") return true
  if (product.status === "published") return true
  return false
}

export const createProduct = async (input: CreateProductInput) => {
  const defaultVariant = input.variants?.find((v) => v.isDefault) ?? input.variants?.[0]
  const effectivePrice = input.salePrice ?? defaultVariant?.price ?? input.price
  const variantStockTotal = (input.variants ?? []).reduce((sum, v) => sum + (v.stock ?? 0), 0)
  const effectiveTotalStock = input.totalStock ?? variantStockTotal
  const effectiveStockStatus = input.stockStatus ?? (effectiveTotalStock > 0 ? "in_stock" : "out_of_stock")
  const uniqueTags = [...new Set((input.tags ?? []).map((t) => t.trim()).filter(Boolean))]
  const sections = normalizeSections(input)
  return prisma.product.create({
    data: {
      sellerId: null,
      createdById: input.createdById ?? null,
      managedById: input.managedById ?? input.createdById ?? null,
      name: input.name,
      slug: input.slug,
      sku: input.sku,
      price: effectivePrice,
      description: input.description,
      type: input.type ?? "variant",
      basePrice: input.basePrice ?? defaultVariant?.mrp ?? null,
      salePrice: input.salePrice ?? effectivePrice,
      discountPercent: input.discountPercent ?? defaultVariant?.discountPercent ?? null,
      taxIncluded: input.taxIncluded ?? true,
      stockStatus: effectiveStockStatus,
      totalStock: effectiveTotalStock,
      shelfLife: input.shelfLife ?? null,
      isActive: input.isActive ?? true,
      isFeatured: input.isFeatured ?? false,
      isBestSeller: input.isBestSeller ?? false,
      thumbnail: input.thumbnail ?? input.images?.[0] ?? null,
      metaTitle: input.metaTitle ?? null,
      metaDescription: input.metaDescription ?? null,
      status: input.status ?? "draft",
      brandId: input.brandId ?? undefined,
      categories: input.categoryId ? { create: [{ categoryId: input.categoryId }] } : undefined,
      variants: input.variants?.length
        ? {
            create: input.variants.map((v) => ({
              name: v.name,
              weight: v.weight ?? null,
              sku: v.sku,
              price: v.price,
              mrp: v.mrp ?? null,
              discountPercent: v.discountPercent ?? null,
              stock: v.stock ?? 0,
              isDefault: Boolean(v.isDefault),
            })),
          }
        : undefined,
      images: input.images?.length
        ? { create: input.images.map((url, i) => ({ url, position: i })) }
        : undefined,
      features: input.features?.length ? { create: input.features } : undefined,
      labels: input.labels?.length ? { create: input.labels } : undefined,
      details: input.details?.length
        ? {
            create: input.details.map((d, i) => ({
              title: d.title,
              content: d.content,
              sortOrder: d.sortOrder ?? i,
            })),
          }
        : undefined,
      sections: sections.length
        ? {
            create: sections.map((s) => ({
              title: s.title,
              description: s.description,
              sortOrder: s.sortOrder,
              isActive: s.isActive,
            })),
          }
        : undefined,
      tags: uniqueTags.length
        ? {
            create: uniqueTags.map((raw) => {
              const name = raw.trim()
              const slug = slugify(name)
              return {
                tag: {
                  connectOrCreate: {
                    where: { slug },
                    create: { name: name.toLowerCase(), slug },
                  },
                },
              }
            }),
          }
        : undefined,
    },
    select: productSelect,
  })
}

export const updateProduct = async (
  id: string,
  input: UpdateProductInput,
  opts: { role: string; userId: string },
) => {
  const existing = await prisma.product.findUnique({
    where: { id },
    select: { id: true },
  })
  if (!existing) throw new Error("Product not found")

  const isAdmin = opts.role === "admin" || opts.role === "super_admin"
  if (!isAdmin) {
    throw new Error("Forbidden")
  }

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
      data: {
        ...("name" in input && input.name !== undefined ? { name: input.name } : {}),
        ...("slug" in input && input.slug !== undefined ? { slug: input.slug } : {}),
        ...("sku" in input && input.sku !== undefined ? { sku: input.sku } : {}),
        ...("price" in input && input.price !== undefined ? { price: input.price } : {}),
        ...("description" in input ? { description: input.description } : {}),
        ...("type" in input && input.type !== undefined ? { type: input.type } : {}),
        ...("basePrice" in input ? { basePrice: input.basePrice } : {}),
        ...("salePrice" in input ? { salePrice: input.salePrice } : {}),
        ...("discountPercent" in input ? { discountPercent: input.discountPercent } : {}),
        ...("taxIncluded" in input && input.taxIncluded !== undefined ? { taxIncluded: input.taxIncluded } : {}),
        ...("stockStatus" in input && input.stockStatus !== undefined ? { stockStatus: input.stockStatus } : {}),
        ...("totalStock" in input && input.totalStock !== undefined ? { totalStock: input.totalStock } : {}),
        ...("shelfLife" in input ? { shelfLife: input.shelfLife } : {}),
        ...("isActive" in input && input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...("isFeatured" in input && input.isFeatured !== undefined ? { isFeatured: input.isFeatured } : {}),
        ...("isBestSeller" in input && input.isBestSeller !== undefined ? { isBestSeller: input.isBestSeller } : {}),
        ...("thumbnail" in input ? { thumbnail: input.thumbnail } : {}),
        ...("metaTitle" in input ? { metaTitle: input.metaTitle } : {}),
        ...("metaDescription" in input ? { metaDescription: input.metaDescription } : {}),
        ...("status" in input && input.status !== undefined ? { status: input.status } : {}),
        ...("brandId" in input ? { brandId: input.brandId ?? null } : {}),
        managedById: opts.userId,
      },
    })

    if ("categoryId" in input) {
      await tx.productCategory.deleteMany({ where: { productId: id } })
      if (input.categoryId) {
        await tx.productCategory.create({
          data: { productId: id, categoryId: input.categoryId },
        })
      }
    }
    if ("variants" in input) {
      await tx.productVariant.deleteMany({ where: { productId: id } })
      if (input.variants?.length) {
        await tx.productVariant.createMany({
          data: input.variants.map((v) => ({
            productId: id,
            name: v.name,
            weight: v.weight ?? null,
            sku: v.sku,
            price: v.price,
            mrp: v.mrp ?? null,
            discountPercent: v.discountPercent ?? null,
            stock: v.stock ?? 0,
            isDefault: Boolean(v.isDefault),
          })),
        })
        if (!("totalStock" in input)) {
          const totalStock = input.variants.reduce((sum, v) => sum + (v.stock ?? 0), 0)
          await tx.product.update({
            where: { id },
            data: {
              totalStock,
              stockStatus: totalStock > 0 ? "in_stock" : "out_of_stock",
            },
          })
        }
      }
    }
    if ("images" in input) {
      await tx.productImage.deleteMany({ where: { productId: id } })
      if (input.images?.length) {
        await tx.productImage.createMany({
          data: input.images.map((url, i) => ({ productId: id, url, position: i })),
        })
      }
    }
    if ("features" in input) {
      await tx.productFeature.deleteMany({ where: { productId: id } })
      if (input.features?.length) {
        await tx.productFeature.createMany({
          data: input.features.map((f) => ({ productId: id, title: f.title, icon: f.icon ?? null })),
        })
      }
    }
    if ("labels" in input) {
      await tx.productLabel.deleteMany({ where: { productId: id } })
      if (input.labels?.length) {
        await tx.productLabel.createMany({
          data: input.labels.map((l) => ({ productId: id, label: l.label, color: l.color ?? null })),
        })
      }
    }
    if ("details" in input) {
      await tx.productDetailSection.deleteMany({ where: { productId: id } })
      if (input.details?.length) {
        await tx.productDetailSection.createMany({
          data: input.details.map((d, i) => ({
            productId: id,
            title: d.title,
            content: d.content,
            sortOrder: d.sortOrder ?? i,
          })),
        })
      }
    }
    if ("sections" in input || "details" in input) {
      const incomingRaw = input.sections?.length
        ? input.sections
        : (input.details ?? []).map((d) => ({
            title: d.title,
            description: d.content,
            sortOrder: d.sortOrder,
            isActive: true,
          }))
      const incoming = incomingRaw
        .map((s, idx) => ({
          id: "id" in s ? s.id : undefined,
          title: s.title.trim(),
          description: sanitizeSectionHtml(s.description),
          sortOrder: s.sortOrder ?? idx,
          isActive: s.isActive ?? true,
        }))
        .filter((s) => s.title && s.description)
        .slice(0, 10)

      const existing = await tx.productSection.findMany({
        where: { productId: id },
        select: { id: true },
      })
      const existingIds = new Set(existing.map((s) => s.id))
      const incomingIds = new Set(incoming.map((s) => s.id).filter((x): x is string => Boolean(x)))
      const removeIds = [...existingIds].filter((sid) => !incomingIds.has(sid))
      if (removeIds.length) {
        await tx.productSection.deleteMany({
          where: { productId: id, id: { in: removeIds } },
        })
      }

      for (const section of incoming) {
        if (section.id && existingIds.has(section.id)) {
          await tx.productSection.update({
            where: { id: section.id },
            data: {
              title: section.title,
              description: section.description,
              sortOrder: section.sortOrder,
              isActive: section.isActive,
            },
          })
        } else {
          await tx.productSection.create({
            data: {
              productId: id,
              title: section.title,
              description: section.description,
              sortOrder: section.sortOrder,
              isActive: section.isActive,
            },
          })
        }
      }
    }
    if ("tags" in input) {
      await tx.productTag.deleteMany({ where: { productId: id } })
      const uniqueTags = [...new Set((input.tags ?? []).map((t) => t.trim()).filter(Boolean))]
      if (uniqueTags.length) {
        for (const raw of uniqueTags) {
          const name = raw.trim().toLowerCase()
          if (!name) continue
          const slug = slugify(name)
          const tag = await tx.tag.upsert({
            where: { slug },
            create: { name, slug },
            update: {},
          })
          await tx.productTag.create({
            data: { productId: id, tagId: tag.id },
          })
        }
      }
    }
  })

  const hydrated = await prisma.product.findUnique({
    where: { id },
    select: productSelect,
  })
  if (!hydrated) throw new Error("Product not found")

  await logActivity({
    actorId: opts.userId,
    action: "product.update",
    entityType: "Product",
    entityId: id,
    metadata: { fields: Object.keys(input) },
  })

  return hydrated
}

export const deleteProduct = async (id: string, opts: { role: string; userId: string }) => {
  const existing = await prisma.product.findUnique({
    where: { id },
    select: { id: true },
  })
  if (!existing) throw new Error("Product not found")

  const isAdmin = opts.role === "admin" || opts.role === "super_admin"
  if (!isAdmin) {
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
