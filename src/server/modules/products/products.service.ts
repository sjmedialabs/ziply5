import { prisma } from "@/src/server/db/prisma"
import { Prisma, type ProductStatus } from "@prisma/client"
import { logActivity } from "@/src/server/modules/activity/activity.service"
import sanitizeHtml from "sanitize-html"

export type ListProductsScope = "public" | "admin"
let cachedDeletedAtSupport: boolean | null = null

const hasDeletedAtColumn = async () => {
  if (cachedDeletedAtSupport !== null) return cachedDeletedAtSupport
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'Product'
        AND column_name = 'deletedAt'
    ) as "exists"
  `
  cachedDeletedAtSupport = Boolean(rows[0]?.exists)
  return cachedDeletedAtSupport
}

type CreateProductInput = {
  name: string
  slug: string
  sku: string
  price: number
  description?: string
  type: "simple" | "variant"
  basePrice?: number | null
  salePrice?: number | null
  discountPercent?: number | null
  taxIncluded?: boolean
  stockStatus?: "in_stock" | "out_of_stock"
  totalStock?: number
  shelfLife?: string | null
  preparationType?: "ready_to_eat" | "ready_to_cook" | null
  spiceLevel?: "mild" | "medium" | "hot" | "extra_hot" | null
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
    id?: string
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
  preparationType: "ready_to_eat" | "ready_to_cook" | null
  spiceLevel: "mild" | "medium" | "hot" | "extra_hot" | null
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
    id?: string
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

// Public list needs to be fast: avoid hydrating rich product sections/labels/details.
// The storefront cards only require: image, basic pricing, veg/non-veg tagging, and category slug.
const productSelectPublicList = {
  id: true,
  brandId: true,
  name: true,
  slug: true,
  description: true,
  basePrice: true,
  salePrice: true,
  price: true,
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
  createdAt: true,
  updatedAt: true,
  images: { take: 1, orderBy: { position: "asc" as const } },
  // Tags drive veg/non-veg detection.
  tags: { include: { tag: true } },
  categories: { include: { category: true }, take: 1 },
  // Weight/sku/stock are needed for product-card rendering.
  variants: {
    select: {
      id: true,
      name: true,
      weight: true,
      price: true,
      sku: true,
      stock: true,
      isDefault: true,
    },
  },
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

const normalizeVariants = (
  variants: Array<{
    id?: string
    name: string
    weight?: string | null
    price: number
    mrp?: number | null
    discountPercent?: number | null
    stock?: number
    sku: string
    isDefault?: boolean
  }> = [],
) => {
  const normalized = variants.map((v, idx) => ({
    id: v.id,
    name: (v.name || v.weight || `Variant ${idx + 1}`).trim(),
    weight: v.weight?.trim() || null,
    sku: v.sku.trim(),
    price: Number(v.price),
    mrp: v.mrp != null ? Number(v.mrp) : null,
    discountPercent: v.discountPercent != null ? Number(v.discountPercent) : null,
    stock: Math.max(0, Number(v.stock ?? 0)),
    isDefault: Boolean(v.isDefault),
  }))
  const defaults = normalized.filter((v) => v.isDefault)
  if (defaults.length > 1) {
    throw new Error("Only one variant can be marked as default")
  }
  if (normalized.length > 0 && defaults.length === 0) {
    normalized[0].isDefault = true
  }
  return normalized
}

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
  filters?: { status?: string; q?: string; inStockOnly?: boolean },
) => {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(Math.floor(limit), 1), 100) : 20
  const skip = (safePage - 1) * safeLimit
  const where: Prisma.ProductWhereInput = {}
  where.isActive = true

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
  if (filters?.inStockOnly) {
    where.totalStock = { gt: 0 }
  }

  const supportDeletedAt = await hasDeletedAtColumn()
  const selectShape = scope === "public" ? productSelectPublicList : productSelect

  if (!supportDeletedAt) {
    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: safeLimit,
        select: selectShape,
      }),
      prisma.product.count({ where }),
    ])
    return { items, total, page: safePage, limit: safeLimit }
  }

  const visibleIds = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT p."id"
    FROM "Product" p
    WHERE p."isActive" = true
      AND p."deletedAt" IS NULL
      ${scope === "public" ? Prisma.sql`AND p."status" = 'published'` : Prisma.empty}
    ORDER BY p."createdAt" DESC
    LIMIT ${safeLimit} OFFSET ${skip}
  `
  const ids = visibleIds.map((row) => row.id)
  const [items, totalRows] = await Promise.all([
    ids.length
      ? prisma.product.findMany({
          where: { ...where, id: { in: ids } },
          select: selectShape,
        })
      : Promise.resolve([]),
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint as count
      FROM "Product" p
      WHERE p."isActive" = true
        AND p."deletedAt" IS NULL
        ${scope === "public" ? Prisma.sql`AND p."status" = 'published'` : Prisma.empty}
    `,
  ])
  const ordered = ids.map((id) => items.find((item) => item.id === id)).filter(Boolean)
  return { items: ordered, total: Number(totalRows[0]?.count ?? 0), page: safePage, limit: safeLimit }
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
  product: { status: string; isActive?: boolean | null },
  scope: ListProductsScope,
) => {
  if (product.isActive === false) return false
  if (scope === "admin") return true
  if (product.status === "published") return true
  return false
}

export const isProductSoftDeleted = async (productId: string) => {
  const supportDeletedAt = await hasDeletedAtColumn()
  if (!supportDeletedAt) return false
  const rows = await prisma.$queryRaw<Array<{ deleted: boolean }>>`
    SELECT ("deletedAt" IS NOT NULL) as deleted
    FROM "Product"
    WHERE id = ${productId}
    LIMIT 1
  `
  return Boolean(rows[0]?.deleted)
}

export const createProduct = async (input: CreateProductInput) => {
  const normalizedVariants = normalizeVariants(input.variants)
  if (input.type === "variant" && normalizedVariants.length === 0) {
    throw new Error("Variant products require at least one variant")
  }
  const defaultVariant = normalizedVariants.find((v) => v.isDefault) ?? normalizedVariants[0]
  const effectivePrice = input.salePrice ?? defaultVariant?.price ?? input.price
  const variantStockTotal = normalizedVariants.reduce((sum, v) => sum + (v.stock ?? 0), 0)
  const effectiveTotalStock = input.type === "variant" ? variantStockTotal : (input.totalStock ?? 0)
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
      type: input.type,
      basePrice: input.basePrice ?? defaultVariant?.mrp ?? null,
      salePrice: input.salePrice ?? effectivePrice,
      discountPercent: input.discountPercent ?? defaultVariant?.discountPercent ?? null,
      taxIncluded: input.taxIncluded ?? true,
      stockStatus: effectiveStockStatus,
      totalStock: effectiveTotalStock,
      shelfLife: input.shelfLife ?? null,
      preparationType: input.preparationType ?? null,
      spiceLevel: input.spiceLevel ?? null,
      isActive: input.isActive ?? true,
      isFeatured: input.isFeatured ?? false,
      isBestSeller: input.isBestSeller ?? false,
      thumbnail: input.thumbnail ?? input.images?.[0] ?? null,
      metaTitle: input.metaTitle ?? null,
      metaDescription: input.metaDescription ?? null,
      status: input.status ?? "draft",
      brandId: input.brandId ?? undefined,
      categories: input.categoryId ? { create: [{ categoryId: input.categoryId }] } : undefined,
      variants: normalizedVariants.length
        ? {
            create: normalizedVariants.map((v) => ({
              name: v.name,
              weight: v.weight ?? null,
              sku: v.sku,
              price: v.price,
              mrp: v.mrp ?? null,
              discountPercent: v.discountPercent ?? null,
              stock: v.stock,
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
    select: { id: true, type: true },
  })
  if (!existing) throw new Error("Product not found")

  const isAdmin = opts.role === "admin" || opts.role === "super_admin"
  if (!isAdmin) {
    throw new Error("Forbidden")
  }

  if ("type" in input && input.type && input.type !== existing.type) {
    throw new Error("Changing product type after creation is not supported")
  }

  const normalizedVariants = "variants" in input ? normalizeVariants(input.variants ?? []) : undefined
  if (existing.type === "variant" && "variants" in input && (normalizedVariants?.length ?? 0) === 0) {
    throw new Error("Variant products require at least one variant")
  }

  let tagRecords: Array<{ id: string }> | undefined
  if ("tags" in input) {
    const uniqueTags = [...new Set((input.tags ?? []).map((t) => t.trim()).filter(Boolean))]
    if (uniqueTags.length) {
      tagRecords = []
      for (const raw of uniqueTags) {
        const name = raw.trim().toLowerCase()
        if (!name) continue
        const slug = slugify(name)
        const tag = await prisma.tag.upsert({
          where: { slug },
          create: { name, slug },
          update: {},
        })
        tagRecords.push(tag)
      }
    }
  }

  await prisma.$transaction(
    async (tx) => {
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
        ...("preparationType" in input ? { preparationType: input.preparationType } : {}),
        ...("spiceLevel" in input ? { spiceLevel: input.spiceLevel } : {}),
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
      if (normalizedVariants?.length) {
        await tx.productVariant.createMany({
          data: normalizedVariants.map((v) => ({
            productId: id,
            name: v.name,
            weight: v.weight ?? null,
            sku: v.sku,
            price: v.price,
            mrp: v.mrp ?? null,
            discountPercent: v.discountPercent ?? null,
            stock: v.stock,
            isDefault: Boolean(v.isDefault),
          })),
        })
        if (!("totalStock" in input)) {
          const totalStock = normalizedVariants.reduce((sum, v) => sum + (v.stock ?? 0), 0)
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
      if (tagRecords?.length) {
        await tx.productTag.createMany({
          data: tagRecords.map((tag) => ({ productId: id, tagId: tag.id })),
        })
      }
    }
  }, { timeout: 10000 })

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
