import { logActivity } from "@/src/server/modules/activity/activity.service"
import sanitizeHtml from "sanitize-html"
import { assertMasterValueExists } from "@/src/server/modules/master/master.service"
import {
  createProductSupabase,
  deleteProductSupabaseBasic,
  getProductByIdSupabaseBasic,
  getProductByIdSupabaseHydrated,
  hydrateProductsForListSupabase,
  getProductIdBySlugSupabase,
  getProductBySlugSupabaseBasic,
  listProductIdsSupabase,
  listProductsSupabaseBasic,
  updateProductSupabase,
} from "@/src/lib/db/products"
import { logger } from "@/lib/logger"

export type ListProductsScope = "public" | "admin"

type CreateProductInput = {
  name: string
  slug: string
  sku: string
  price: number
  description?: string
  type?: "simple" | "variant"
  basePrice?: number | null
  discountPercent?: number | null
  foodType?: string | null
  allowReturn?: boolean
  weight?: string | null
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
  tagIds?: string[]
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
  weight: string | null
  taxIncluded: boolean
  stockStatus: "in_stock" | "out_of_stock"
  totalStock: number
  shelfLife: string | null
  preparationType: "ready_to_eat" | "ready_to_cook" | null
  spiceLevel: "mild" | "medium" | "hot" | "extra_hot" | null
  isActive: boolean
  isFeatured: boolean
  isBestSeller: boolean
  allowReturn?: boolean
  thumbnail: string | null
  metaTitle: string | null
  metaDescription: string | null
  status: "draft" | "published" | "archived"
  categoryId: string | null
  tagIds: string[]
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

export function applyPromotionToProduct(product: any) {
  /* ===========================================================
     SIMPLE PRODUCT LOGIC
     =========================================================== */

  if (product.type === "simple") {

    const basePrice =
      Number(product.basePrice ?? product.price)

    let discountPercent = 0
    let saleName: string | null = null

    /* ---------- PRODUCT PROMOTION ---------- */

    if (product.promotionLinks?.length) {

      const promo =
        product.promotionLinks[0]?.promotion

      const discount =
        promo?.metadata?.products
          ?.find(
            (p: any) =>
              p.productId === product.id
          )
          ?.discountPercent ?? 0

      if (discount > 0) {

        discountPercent = discount
        saleName = promo?.name ?? null

      }

    }

    /* ---------- NORMAL PRODUCT DISCOUNT ---------- */

    if (discountPercent === 0) {

      discountPercent =
        Number(product.discountPercent ?? 0)

    }

    /* ---------- FINAL PRICE ---------- */

    const finalPrice =
      basePrice -
      (basePrice * discountPercent / 100)

    /* ---------- RENAME FIELDS ---------- */

    product.oldPrice = basePrice
    product.price = Math.round(finalPrice)

    product.discountPercent =
      discountPercent

    product.saleName =
      saleName

    delete product.finalPrice
    delete product.promotionLinks

    product.variants =
      product.variants?.map((variant: any) => {

        delete variant.promotionLinks

        return variant

      })

    return product
  }



  /* ===========================================================
     PRODUCT LEVEL (VARIANT PRODUCTS)
     =========================================================== */

  if (product.promotionLinks?.length) {

    const promo =
      product.promotionLinks[0]?.promotion

    const discount =
      promo?.metadata?.discountPercent ?? 0

    if (discount > 0) {

      const basePrice =
        Number(product.basePrice ?? product.price)

      const finalPrice =
        basePrice -
        (basePrice * discount / 100)

      /* ---------- RENAME ---------- */

      product.oldPrice = basePrice
      product.price = Math.round(finalPrice)

      product.discountPercent =
        discount

      product.promotion = {
        name: promo.name,
        kind: promo.kind
      }

    }

  }
  else {

    product.oldPrice =
      Number(product.price)

    product.price =
      Number(product.price)

    product.discountPercent =
      Number(product.discountPercent ?? 0)

  }



  /* ===========================================================
     VARIANT LEVEL
     =========================================================== */

  product.variants =
    product.variants?.map((variant: any) => {

      const originalPrice =
        Number(
          variant.mrp ??
          variant.price
        )

      if (variant.promotionLinks?.length) {

        const promo =
          variant.promotionLinks[0]?.promotion

        const discount =
          variant.promotionLinks[0]
            ?.metadata?.discountPercent ?? 0

        if (discount > 0) {

          const finalPrice =
            originalPrice -
            (originalPrice * discount / 100)

          /* ---------- RENAME ---------- */

          variant.oldPrice =
            originalPrice

          variant.price =
            Math.round(finalPrice)

          variant.discountPercent =
            discount

          variant.promotion = {

            name: promo.name,

            kind: promo.kind

          }

        }

      }
      else {

        variant.oldPrice =
          originalPrice

        variant.price =
          Number(variant.price)

        variant.discountPercent =
          Number(
            variant.discountPercent ?? 0
          )

      }

      delete variant.promotionLinks

      return variant

    })

  delete product.promotionLinks

  return product

}

export const listProducts = async (
  page = 1,
  limit = 20,
  scope: ListProductsScope,
  filters?: { status?: string; q?: string; inStockOnly?: boolean },
) => {
  if (process.env.SUPABASE_PRODUCTS_READ_ENABLED !== "true") {
    throw new Error("SUPABASE_PRODUCTS_READ_ENABLED must be true")
  }
  const payload = await listProductsSupabaseBasic({
    page,
    limit,
    status: scope === "public" ? "published" : filters?.status,
    q: filters?.q,
  })
  const items = (payload.items as any[]).filter((row) => {
    if (scope === "public" && String(row.status ?? "") !== "published") return false
    if (scope === "public" && filters?.inStockOnly) return Number(row.totalStock ?? row.total_stock ?? 0) > 0
    return true
  })
  const hydrated = await hydrateProductsForListSupabase(items as any[])
  return { items: hydrated, total: payload.total, page: payload.page, limit: payload.limit }
}

export const getProductById = async (id: string) => {
  if (process.env.SUPABASE_PRODUCTS_READ_ENABLED !== "true") {
    throw new Error("SUPABASE_PRODUCTS_READ_ENABLED must be true")
  }
  return (await getProductByIdSupabaseHydrated(id)) as any
}

export const getProductBySlug = async (slug: string) => {
  if (process.env.SUPABASE_PRODUCTS_READ_ENABLED !== "true") {
    throw new Error("SUPABASE_PRODUCTS_READ_ENABLED must be true")
  }
  const id = await getProductIdBySlugSupabase(slug)
  if (id) return (await getProductByIdSupabaseHydrated(id)) as any
  return (await getProductBySlugSupabaseBasic(slug)) as any
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
  const effectivePrice = defaultVariant?.price ?? input.price
  const variantStockTotal = (input.variants ?? []).reduce((sum, v) => sum + (v.stock ?? 0), 0)
  const effectiveTotalStock = input.totalStock ?? variantStockTotal
  const effectiveStockStatus = input.stockStatus ?? (effectiveTotalStock > 0 ? "in_stock" : "out_of_stock")
  const uniqueTagIds = [...new Set((input.tagIds ?? []).map((tagId) => tagId.trim()).filter(Boolean))]
  const sections = normalizeSections(input)
  const baseData = {
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
      discountPercent: input.discountPercent ?? defaultVariant?.discountPercent ?? null,
      weight: input.weight ?? null,
      taxIncluded: input.taxIncluded ?? true,
      stockStatus: effectiveStockStatus,
      totalStock: effectiveTotalStock,
      shelfLife: input.shelfLife ?? null,
      preparationType: input.preparationType ?? null,
      spiceLevel: input.spiceLevel ?? null,
      isActive: input.isActive ?? true,
      isFeatured: input.isFeatured ?? false,
      isBestSeller: input.isBestSeller ?? false,
      allowReturn: input.allowReturn ?? true,
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
      tags: input.tagIds?.length ? { create: input.tagIds.map((tagId) => ({ tagId })) } : undefined,
    }
  if (process.env.SUPABASE_PRODUCTS_WRITE_ENABLED === "true") {
    // Supabase writes expect flat scalar columns only (no nested Prisma-style relation payloads).
    const {
      categories: _categories,
      variants: _variants,
      images: _images,
      features: _features,
      labels: _labels,
      details: _details,
      sections: _sections,
      tags: _tags,
      ...baseSupabase
    } = (baseData as unknown) as Record<string, unknown>
    const created = await createProductSupabase({
      base: baseSupabase,
      categoryId: input.categoryId ?? null,
      tagIds: uniqueTagIds,
      variants: input.variants?.map((v) => ({
        name: v.name,
        weight: v.weight ?? null,
        sku: v.sku,
        price: v.price,
        mrp: v.mrp ?? null,
        discountPercent: v.discountPercent ?? null,
        stock: v.stock ?? 0,
        isDefault: Boolean(v.isDefault),
      })),
      images: input.images,
      features: input.features,
      labels: input.labels,
      details: input.details,
      sections,
    })
    const supabaseHydrated = await getProductByIdSupabaseHydrated(created.id)
    if (supabaseHydrated) return supabaseHydrated as any
    return { id: created.id } as any
  }
  throw new Error("SUPABASE_PRODUCTS_WRITE_ENABLED must be true")
}

export const updateProduct = async (
  id: string,
  input: UpdateProductInput,
  opts: { role: string; userId: string },
) => {
  if (process.env.SUPABASE_PRODUCTS_READ_ENABLED !== "true") throw new Error("SUPABASE_PRODUCTS_READ_ENABLED must be true")
  if (process.env.SUPABASE_PRODUCTS_WRITE_ENABLED !== "true") throw new Error("SUPABASE_PRODUCTS_WRITE_ENABLED must be true")
  const existing: any = await getProductByIdSupabaseBasic(id)
  if (!existing) throw new Error("Product not found")

  const isAdmin = opts.role === "admin" || opts.role === "super_admin"
  if (!isAdmin) {
    throw new Error("Forbidden")
  }

  const incomingRaw = input.sections?.length
    ? input.sections
    : (input.details ?? []).map((d) => ({
        title: d.title,
        description: d.content,
        sortOrder: d.sortOrder,
        isActive: true,
      }))
  const incomingSections = incomingRaw
    .map((s, idx) => ({
      id: "id" in s ? s.id : undefined,
      title: s.title.trim(),
      description: sanitizeSectionHtml(s.description),
      sortOrder: s.sortOrder ?? idx,
      isActive: s.isActive ?? true,
    }))
    .filter((s) => s.title && s.description)
    .slice(0, 10)

  await updateProductSupabase({
    productId: id,
    baseUpdate: {
      ...("name" in input && input.name !== undefined ? { name: input.name } : {}),
      ...("slug" in input && input.slug !== undefined ? { slug: input.slug } : {}),
      ...("sku" in input && input.sku !== undefined ? { sku: input.sku } : {}),
      ...("price" in input && input.price !== undefined ? { price: input.price } : {}),
      ...("description" in input ? { description: input.description } : {}),
      ...("type" in input && input.type !== undefined ? { type: input.type } : {}),
      ...("basePrice" in input ? { basePrice: input.basePrice } : {}),
      ...("salePrice" in input ? { salePrice: input.salePrice } : {}),
      ...("discountPercent" in input ? { discountPercent: input.discountPercent } : {}),
      ...("weight" in input ? { weight: input.weight } : {}),
      ...("taxIncluded" in input && input.taxIncluded !== undefined ? { taxIncluded: input.taxIncluded } : {}),
      ...("stockStatus" in input && input.stockStatus !== undefined ? { stockStatus: input.stockStatus } : {}),
      ...("totalStock" in input && input.totalStock !== undefined ? { totalStock: input.totalStock } : {}),
      ...("shelfLife" in input ? { shelfLife: input.shelfLife } : {}),
      ...("preparationType" in input ? { preparationType: input.preparationType } : {}),
      ...("spiceLevel" in input ? { spiceLevel: input.spiceLevel } : {}),
      ...("isActive" in input && input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...("isFeatured" in input && input.isFeatured !== undefined ? { isFeatured: input.isFeatured } : {}),
      ...("isBestSeller" in input && input.isBestSeller !== undefined ? { isBestSeller: input.isBestSeller } : {}),
      ...("allowReturn" in input && input.allowReturn !== undefined ? { allowReturn: input.allowReturn } : {}),
      ...("thumbnail" in input ? { thumbnail: input.thumbnail } : {}),
      ...("metaTitle" in input ? { metaTitle: input.metaTitle } : {}),
      ...("metaDescription" in input ? { metaDescription: input.metaDescription } : {}),
      ...("status" in input && input.status !== undefined ? { status: input.status } : {}),
      ...("brandId" in input ? { brandId: input.brandId ?? null } : {}),
      managedById: opts.userId,
    },
    categoryId: "categoryId" in input ? (input.categoryId ?? null) : undefined,
    variants:
      "variants" in input
        ? (input.variants ?? []).map((v) => ({
            name: v.name,
            weight: v.weight ?? null,
            sku: v.sku,
            price: v.price,
            mrp: v.mrp ?? null,
            discountPercent: v.discountPercent ?? null,
            stock: v.stock ?? 0,
            isDefault: Boolean(v.isDefault),
          }))
        : undefined,
    images: "images" in input ? (input.images ?? []) : undefined,
    features: "features" in input ? (input.features ?? []) : undefined,
    labels: "labels" in input ? (input.labels ?? []) : undefined,
    details: "details" in input ? (input.details ?? []) : undefined,
    sections: "sections" in input || "details" in input ? incomingSections : undefined,
    tagIds: "tagIds" in input ? [...new Set((input.tagIds ?? []).map((tagId) => tagId.trim()).filter(Boolean))] : undefined,
  })
  const hydrated = await getProductByIdSupabaseBasic(id)
  if (!hydrated) throw new Error("Product not found")

  await logActivity({
    actorId: opts.userId,
    action: "product.update",
    entityType: "Product",
    entityId: id,
    metadata: { fields: Object.keys(input) },
  })

  return hydrated as any
}

export const deleteProduct = async (id: string, opts: { role: string; userId: string }) => {
  if (process.env.SUPABASE_PRODUCTS_READ_ENABLED !== "true") throw new Error("SUPABASE_PRODUCTS_READ_ENABLED must be true")
  if (process.env.SUPABASE_PRODUCTS_WRITE_ENABLED !== "true") throw new Error("SUPABASE_PRODUCTS_WRITE_ENABLED must be true")
  const existing: any = await getProductByIdSupabaseBasic(id)
  if (!existing) throw new Error("Product not found")

  const isAdmin = opts.role === "admin" || opts.role === "super_admin"
  if (!isAdmin) {
    throw new Error("Forbidden")
  }

  const deleted = await deleteProductSupabaseBasic(id)
  if (!deleted) throw new Error("Supabase product delete failed")

  await logActivity({
    actorId: opts.userId,
    action: "product.delete",
    entityType: "Product",
    entityId: id,
  })

  return { id }
}
