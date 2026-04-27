import { getSupabaseAdmin } from "@/src/lib/supabase/admin"
import { readFromCandidateTables } from "@/src/lib/db/_shared"

type ProductRow = Record<string, unknown>

const PRODUCT_TABLES = ["Product", "products", "product"]
const PRODUCT_CATEGORY_TABLES = ["ProductCategory", "product_categories"]
const PRODUCT_VARIANT_TABLES = ["ProductVariant", "product_variants"]
const PRODUCT_IMAGE_TABLES = ["ProductImage", "product_images"]
const PRODUCT_FEATURE_TABLES = ["ProductFeature", "product_features"]
const PRODUCT_LABEL_TABLES = ["ProductLabel", "product_labels"]
const PRODUCT_DETAIL_TABLES = ["ProductDetailSection", "product_detail_sections"]
const PRODUCT_SECTION_TABLES = ["ProductSection", "product_sections"]
const PRODUCT_TAG_TABLES = ["ProductTag", "product_tags"]
const TAG_TABLES = ["Tag", "tags"]

export const listProductsSupabaseBasic = async (input: {
  page?: number
  limit?: number
  status?: string
  q?: string
}) => {
  const client = getSupabaseAdmin()
  const page = Math.max(1, input.page ?? 1)
  const limit = Math.min(100, Math.max(1, input.limit ?? 20))
  const offset = (page - 1) * limit
  const errors: string[] = []

  for (const table of PRODUCT_TABLES) {
    const attempts = [
      () => client.from(table).select("*", { count: "exact" }).order("createdAt", { ascending: false }).range(offset, offset + limit - 1),
      () => client.from(table).select("*", { count: "exact" }).order("created_at", { ascending: false }).range(offset, offset + limit - 1),
      () => client.from(table).select("*", { count: "exact" }).range(offset, offset + limit - 1),
    ]
    for (const run of attempts) {
      let query = run()
      if (input.status) query = query.eq("status", input.status)
      if (input.q?.trim()) query = query.or(`name.ilike.%${input.q.trim()}%,slug.ilike.%${input.q.trim()}%,sku.ilike.%${input.q.trim()}%`)
      const { data, error, count } = await query
      if (error) {
        errors.push(`${table}: ${error.message}`)
        continue
      }
      return { items: (data ?? []) as ProductRow[], total: count ?? 0, page, limit }
    }
  }
  throw new Error(`Unable to list products via Supabase${errors.length ? ` (${errors.slice(0, 3).join(" | ")})` : ""}`)
}

export const getProductBySlugSupabaseBasic = async (slug: string) => {
  const client = getSupabaseAdmin()
  const rows = await readFromCandidateTables<ProductRow>(client, PRODUCT_TABLES, "*", {
    limit: 1,
  })
  return rows.find((row) => String((row as any).slug ?? "") === slug) ?? null
}

const extractId = (row: ProductRow): string | null =>
  String((row as any).id ?? "").trim() || null

const safeString = (value: unknown) => String(value ?? "").trim()

const insertFirst = async (tables: string[], payloads: Array<Record<string, unknown>>) => {
  const client = getSupabaseAdmin()
  for (const table of tables) {
    for (const payload of payloads) {
      const { data, error } = await client.from(table).insert(payload).select("id").maybeSingle()
      if (!error && data) return data as Record<string, unknown>
    }
  }
  return null
}

const updateFirst = async (tables: string[], payloads: Array<Record<string, unknown>>, id: string) => {
  const client = getSupabaseAdmin()
  for (const table of tables) {
    for (const payload of payloads) {
      const { data, error } = await client.from(table).update(payload).eq("id", id).select("id").maybeSingle()
      if (!error && data) return true
    }
  }
  return false
}

const deleteByProductId = async (tables: string[], productId: string) => {
  const client = getSupabaseAdmin()
  for (const table of tables) {
    const attempts = [
      () => client.from(table).delete().eq("productId", productId),
      () => client.from(table).delete().eq("product_id", productId),
    ]
    for (const run of attempts) {
      const { error } = await run()
      if (!error) break
    }
  }
}

export const listProductIdsSupabase = async (input: {
  page?: number
  limit?: number
  status?: string
  q?: string
}) => {
  const payload = await listProductsSupabaseBasic(input)
  const ids = payload.items.map(extractId).filter((id): id is string => Boolean(id))
  return { ids, total: payload.total, page: payload.page, limit: payload.limit }
}

export const getProductIdBySlugSupabase = async (slug: string) => {
  const row = await getProductBySlugSupabaseBasic(slug)
  if (!row) return null
  return extractId(row)
}

export const getProductByIdSupabaseBasic = async (id: string) => {
  const client = getSupabaseAdmin()
  for (const table of PRODUCT_TABLES) {
    const attempts = [
      () => client.from(table).select("*").eq("id", id).maybeSingle(),
      () => client.from(table).select("*").eq("id", id).maybeSingle(),
    ]
    for (const run of attempts) {
      const { data, error } = await run()
      if (!error) return (data as ProductRow | null) ?? null
    }
  }
  return null
}

export const deleteProductSupabaseBasic = async (id: string) => {
  const client = getSupabaseAdmin()
  for (const table of PRODUCT_TABLES) {
    const { data, error } = await client.from(table).delete().eq("id", id).select("id").maybeSingle()
    if (!error && data?.id) return true
  }
  return false
}

export const createProductSupabase = async (input: {
  base: Record<string, unknown>
  categoryId?: string | null
  variants?: Array<Record<string, unknown>>
  images?: string[]
  features?: Array<{ title: string; icon?: string | null }>
  labels?: Array<{ label: string; color?: string | null }>
  details?: Array<{ title: string; content: string; sortOrder?: number }>
  sections?: Array<{ title: string; description: string; sortOrder?: number; isActive?: boolean }>
  tags?: string[]
}) => {
  const created = await insertFirst(PRODUCT_TABLES, [
    input.base,
    // snake_case fallback
    Object.fromEntries(Object.entries(input.base).map(([k, v]) => [k.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`), v])),
  ])
  const productId = safeString(created?.id)
  if (!productId) throw new Error("Unable to create product via Supabase")

  if (input.categoryId) {
    await insertFirst(PRODUCT_CATEGORY_TABLES, [
      { productId, categoryId: input.categoryId },
      { product_id: productId, category_id: input.categoryId },
    ])
  }

  for (const v of input.variants ?? []) {
    await insertFirst(PRODUCT_VARIANT_TABLES, [
      { ...v, productId },
      { ...v, product_id: productId },
    ])
  }

  for (const [i, url] of (input.images ?? []).entries()) {
    await insertFirst(PRODUCT_IMAGE_TABLES, [
      { productId, url, position: i },
      { product_id: productId, url, position: i },
    ])
  }

  for (const f of input.features ?? []) {
    await insertFirst(PRODUCT_FEATURE_TABLES, [
      { productId, title: f.title, icon: f.icon ?? null },
      { product_id: productId, title: f.title, icon: f.icon ?? null },
    ])
  }

  for (const l of input.labels ?? []) {
    await insertFirst(PRODUCT_LABEL_TABLES, [
      { productId, label: l.label, color: l.color ?? null },
      { product_id: productId, label: l.label, color: l.color ?? null },
    ])
  }

  for (const [i, d] of (input.details ?? []).entries()) {
    await insertFirst(PRODUCT_DETAIL_TABLES, [
      { productId, title: d.title, content: d.content, sortOrder: d.sortOrder ?? i },
      { product_id: productId, title: d.title, content: d.content, sort_order: d.sortOrder ?? i },
    ])
  }

  for (const [i, s] of (input.sections ?? []).entries()) {
    await insertFirst(PRODUCT_SECTION_TABLES, [
      { productId, title: s.title, description: s.description, sortOrder: s.sortOrder ?? i, isActive: s.isActive ?? true },
      { product_id: productId, title: s.title, description: s.description, sort_order: s.sortOrder ?? i, is_active: s.isActive ?? true },
    ])
  }

  for (const raw of input.tags ?? []) {
    const name = safeString(raw).toLowerCase()
    if (!name) continue
    const slug = name.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    let tagId = ""
    const createdTag = await insertFirst(TAG_TABLES, [{ name, slug }])
    tagId = safeString(createdTag?.id)
    if (!tagId) {
      const client = getSupabaseAdmin()
      for (const table of TAG_TABLES) {
        const { data, error } = await client.from(table).select("id").eq("slug", slug).maybeSingle()
        if (!error && data?.id) {
          tagId = safeString(data.id)
          break
        }
      }
    }
    if (tagId) {
      await insertFirst(PRODUCT_TAG_TABLES, [
        { productId, tagId },
        { product_id: productId, tag_id: tagId },
      ])
    }
  }

  return { id: productId }
}

export const updateProductSupabase = async (input: {
  productId: string
  baseUpdate: Record<string, unknown>
  categoryId?: string | null
  variants?: Array<Record<string, unknown>>
  images?: string[]
  features?: Array<{ title: string; icon?: string | null }>
  labels?: Array<{ label: string; color?: string | null }>
  details?: Array<{ title: string; content: string; sortOrder?: number }>
  sections?: Array<{ id?: string; title: string; description: string; sortOrder?: number; isActive?: boolean }>
  tags?: string[]
}) => {
  const updated = await updateFirst(
    PRODUCT_TABLES,
    [
      input.baseUpdate,
      Object.fromEntries(
        Object.entries(input.baseUpdate).map(([k, v]) => [k.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`), v]),
      ),
    ],
    input.productId,
  )
  if (!updated) throw new Error("Unable to update base product via Supabase")

  if (input.categoryId !== undefined) {
    await deleteByProductId(PRODUCT_CATEGORY_TABLES, input.productId)
    if (input.categoryId) {
      await insertFirst(PRODUCT_CATEGORY_TABLES, [
        { productId: input.productId, categoryId: input.categoryId },
        { product_id: input.productId, category_id: input.categoryId },
      ])
    }
  }
  if (input.variants !== undefined) {
    await deleteByProductId(PRODUCT_VARIANT_TABLES, input.productId)
    for (const v of input.variants ?? []) {
      await insertFirst(PRODUCT_VARIANT_TABLES, [{ ...v, productId: input.productId }, { ...v, product_id: input.productId }])
    }
  }
  if (input.images !== undefined) {
    await deleteByProductId(PRODUCT_IMAGE_TABLES, input.productId)
    for (const [i, url] of (input.images ?? []).entries()) {
      await insertFirst(PRODUCT_IMAGE_TABLES, [
        { productId: input.productId, url, position: i },
        { product_id: input.productId, url, position: i },
      ])
    }
  }
  if (input.features !== undefined) {
    await deleteByProductId(PRODUCT_FEATURE_TABLES, input.productId)
    for (const f of input.features ?? []) {
      await insertFirst(PRODUCT_FEATURE_TABLES, [
        { productId: input.productId, title: f.title, icon: f.icon ?? null },
        { product_id: input.productId, title: f.title, icon: f.icon ?? null },
      ])
    }
  }
  if (input.labels !== undefined) {
    await deleteByProductId(PRODUCT_LABEL_TABLES, input.productId)
    for (const l of input.labels ?? []) {
      await insertFirst(PRODUCT_LABEL_TABLES, [
        { productId: input.productId, label: l.label, color: l.color ?? null },
        { product_id: input.productId, label: l.label, color: l.color ?? null },
      ])
    }
  }
  if (input.details !== undefined) {
    await deleteByProductId(PRODUCT_DETAIL_TABLES, input.productId)
    for (const [i, d] of (input.details ?? []).entries()) {
      await insertFirst(PRODUCT_DETAIL_TABLES, [
        { productId: input.productId, title: d.title, content: d.content, sortOrder: d.sortOrder ?? i },
        { product_id: input.productId, title: d.title, content: d.content, sort_order: d.sortOrder ?? i },
      ])
    }
  }
  if (input.sections !== undefined) {
    await deleteByProductId(PRODUCT_SECTION_TABLES, input.productId)
    for (const [i, s] of (input.sections ?? []).entries()) {
      await insertFirst(PRODUCT_SECTION_TABLES, [
        {
          productId: input.productId,
          title: s.title,
          description: s.description,
          sortOrder: s.sortOrder ?? i,
          isActive: s.isActive ?? true,
        },
        {
          product_id: input.productId,
          title: s.title,
          description: s.description,
          sort_order: s.sortOrder ?? i,
          is_active: s.isActive ?? true,
        },
      ])
    }
  }
  if (input.tags !== undefined) {
    await deleteByProductId(PRODUCT_TAG_TABLES, input.productId)
    for (const raw of input.tags ?? []) {
      const name = safeString(raw).toLowerCase()
      if (!name) continue
      const slug = name.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
      let tagId = safeString((await insertFirst(TAG_TABLES, [{ name, slug }]))?.id)
      if (!tagId) {
        const client = getSupabaseAdmin()
        for (const table of TAG_TABLES) {
          const { data, error } = await client.from(table).select("id").eq("slug", slug).maybeSingle()
          if (!error && data?.id) {
            tagId = safeString(data.id)
            break
          }
        }
      }
      if (tagId) {
        await insertFirst(PRODUCT_TAG_TABLES, [
          { productId: input.productId, tagId },
          { product_id: input.productId, tag_id: tagId },
        ])
      }
    }
  }
  return { id: input.productId }
}

