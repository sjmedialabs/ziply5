import { getSupabaseAdmin } from "@/src/lib/supabase/admin"
import { logger } from "@/lib/logger"
import crypto from "node:crypto"

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
const USER_TABLES = ["User", "users"]

const existsById = async (tables: string[], id: string): Promise<boolean> => {
  const client = getSupabaseAdmin()
  const value = safeString(id)
  if (!value) return false
  for (const table of tables) {
    const { data, error } = await client.from(table).select("id").eq("id", value).maybeSingle()
    if (error) continue
    if (data?.id) return true
  }
  return false
}

const normalizeActorFks = async (base: Record<string, unknown>) => {
  const createdById = safeString((base as any).createdById)
  const managedById = safeString((base as any).managedById)
  if (!createdById && !managedById) return base
  const createdOk = createdById ? await existsById(USER_TABLES, createdById) : true
  const managedOk = managedById ? await existsById(USER_TABLES, managedById) : true
  if (createdOk && managedOk) return base
  // Keep writes unblocked even when auth subject doesn't map to a User row yet.
  return {
    ...base,
    ...(createdOk ? {} : { createdById: null }),
    ...(managedOk ? {} : { managedById: null }),
  }
}

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
  for (const table of PRODUCT_TABLES) {
    const { data, error } = await client
      .from(table)
      .select("*")
      .eq("slug", slug)
      .maybeSingle()
    if (error) continue
    if (data) return data as ProductRow
  }
  return null
}

const extractId = (row: ProductRow): string | null =>
  String((row as any).id ?? "").trim() || null

const safeString = (value: unknown) => String(value ?? "").trim()

const camelToSnake = (key: string) => key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`)

const withTimestampsForInsert = (base: Record<string, unknown>) => {
  const now = new Date().toISOString()
  const createdAt = base.createdAt ?? base.created_at ?? now
  const updatedAt = base.updatedAt ?? base.updated_at ?? now
  return { ...base, createdAt, updatedAt }
}

const withTimestampForUpdate = (base: Record<string, unknown>) => {
  const now = new Date().toISOString()
  return { ...base, updatedAt: base.updatedAt ?? base.updated_at ?? now }
}

const shouldRetryWithTimestamps = (message: string) => {
  const m = message.toLowerCase()
  return (
    m.includes("violates not-null constraint") &&
    (m.includes('"updatedat"') || m.includes('"createdat"') || m.includes('"updated_at"') || m.includes('"created_at"'))
  )
}

const withId = (payload: Record<string, unknown>) => {
  if (payload.id != null && String(payload.id).trim()) return payload
  return { id: crypto.randomUUID(), ...payload }
}

const insertFirst = async (
  tables: string[],
  payloads: Array<Record<string, unknown>>,
): Promise<{ row: Record<string, unknown> | null; errors: string[] }> => {
  const client = getSupabaseAdmin()
  const errors: string[] = []
  for (const table of tables) {
    for (const payload of payloads) {
      const { data, error } = await client.from(table).insert(payload).select("id").maybeSingle()
      if (!error && data) return { row: data as Record<string, unknown>, errors }
      if (error) {
        errors.push(`${table}: ${error.message}`)
        if (shouldRetryWithTimestamps(error.message)) {
          const now = new Date().toISOString()
          const camelPayload = { ...payload, createdAt: (payload as any).createdAt ?? now, updatedAt: (payload as any).updatedAt ?? now }
          const retryCamel = await client.from(table).insert(camelPayload).select("id").maybeSingle()
          if (!retryCamel.error && retryCamel.data) return { row: retryCamel.data as Record<string, unknown>, errors }
          if (retryCamel.error) errors.push(`${table} (retry timestamps): ${retryCamel.error.message}`)
        }
      }
    }
  }
  return { row: null, errors }
}

const insertFirstNoId = async (
  tables: string[],
  payloads: Array<Record<string, unknown>>,
): Promise<{ ok: boolean; errors: string[] }> => {
  const client = getSupabaseAdmin()
  const errors: string[] = []
  for (const table of tables) {
    for (const payload of payloads) {
      const { error } = await client.from(table).insert(payload)
      if (!error) return { ok: true, errors }
      errors.push(`${table}: ${error.message}`)
    }
  }
  return { ok: false, errors }
}

const updateFirst = async (
  tables: string[],
  payloads: Array<Record<string, unknown>>,
  id: string,
): Promise<{ ok: boolean; errors: string[] }> => {
  const client = getSupabaseAdmin()
  const errors: string[] = []
  for (const table of tables) {
    for (const payload of payloads) {
      const { data, error } = await client.from(table).update(payload).eq("id", id).select("id").maybeSingle()
      if (!error && data) return { ok: true, errors }
      if (error) errors.push(`${table}: ${error.message}`)
    }
  }
  return { ok: false, errors }
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

const readByProductId = async <T extends Record<string, unknown>>(
  tables: string[],
  productId: string,
  opts?: { orderBy?: { camel: string; snake: string; ascending?: boolean } },
): Promise<T[]> => {
  const client = getSupabaseAdmin()
  for (const table of tables) {
    const attempts = [
      () =>
        opts?.orderBy
          ? client
              .from(table)
              .select("*")
              .eq("productId", productId)
              .order(opts.orderBy.camel, { ascending: opts.orderBy.ascending ?? true })
          : client.from(table).select("*").eq("productId", productId),
      () =>
        opts?.orderBy
          ? client
              .from(table)
              .select("*")
              .eq("product_id", productId)
              .order(opts.orderBy.snake, { ascending: opts.orderBy.ascending ?? true })
          : client.from(table).select("*").eq("product_id", productId),
    ]
    for (const run of attempts) {
      const { data, error } = await run()
      if (error) continue
      if (Array.isArray(data)) return data as T[]
    }
  }
  return []
}

const readByProductIds = async <T extends Record<string, unknown>>(
  tables: string[],
  productIds: string[],
): Promise<T[]> => {
  const client = getSupabaseAdmin()
  const ids = productIds.map(safeString).filter(Boolean)
  if (!ids.length) return []
  for (const table of tables) {
    const attempts = [
      () => client.from(table).select("*").in("productId", ids),
      () => client.from(table).select("*").in("product_id", ids),
    ]
    for (const run of attempts) {
      const { data, error } = await run()
      if (error) continue
      if (Array.isArray(data)) return data as T[]
    }
  }
  return []
}

const readByIds = async <T extends Record<string, unknown>>(
  tables: string[],
  ids: string[],
): Promise<T[]> => {
  const client = getSupabaseAdmin()
  const clean = ids.map(safeString).filter(Boolean)
  if (!clean.length) return []
  for (const table of tables) {
    const { data, error } = await client.from(table).select("*").in("id", clean)
    if (!error && Array.isArray(data)) return data as T[]
  }
  return []
}

const shapeCategories = (rows: Array<Record<string, unknown>>) =>
  rows
    .map((row) => safeString((row as any).categoryId ?? (row as any).category_id))
    .filter(Boolean)
    .map((categoryId) => ({ categoryId }))

const shapeTags = (tagRows: Array<Record<string, unknown>>) =>
  tagRows
    .map((row) => safeString((row as any).name))
    .filter(Boolean)
    .map((name) => ({ tag: { name } }))

export const getProductByIdSupabaseHydrated = async (id: string) => {
  const base = await getProductByIdSupabaseBasic(id)
  if (!base) return null

  const [variants, images, features, labels, details, sections, categories, productTags] = await Promise.all([
    readByProductId(PRODUCT_VARIANT_TABLES, id),
    readByProductId(PRODUCT_IMAGE_TABLES, id, { orderBy: { camel: "position", snake: "position", ascending: true } }),
    readByProductId(PRODUCT_FEATURE_TABLES, id),
    readByProductId(PRODUCT_LABEL_TABLES, id),
    readByProductId(PRODUCT_DETAIL_TABLES, id, { orderBy: { camel: "sortOrder", snake: "sort_order", ascending: true } }),
    readByProductId(PRODUCT_SECTION_TABLES, id, { orderBy: { camel: "sortOrder", snake: "sort_order", ascending: true } }),
    readByProductId(PRODUCT_CATEGORY_TABLES, id),
    readByProductId(PRODUCT_TAG_TABLES, id),
  ])

  // Optionally hydrate tags (best-effort; keep empty if table mismatch).
  const tagIds = (productTags ?? [])
    .map((row) => safeString((row as any).tagId ?? (row as any).tag_id))
    .filter(Boolean)
  let tags: ProductRow[] = []
  if (tagIds.length) {
    tags = await readByIds(TAG_TABLES, tagIds)
  }

  return {
    ...base,
    variants,
    images,
    features,
    labels,
    details,
    sections,
    // Match admin UI expected shapes.
    categories: shapeCategories(categories ?? []),
    tags: shapeTags(tags ?? []),
  } as ProductRow
}

export const hydrateProductsForListSupabase = async <T extends Record<string, unknown>>(items: T[]) => {
  const ids = items.map((row) => safeString((row as any).id)).filter(Boolean)
  if (!ids.length) return items

  const [variantRows, categoryRows, productTagRows] = await Promise.all([
    readByProductIds(PRODUCT_VARIANT_TABLES, ids),
    readByProductIds(PRODUCT_CATEGORY_TABLES, ids),
    readByProductIds(PRODUCT_TAG_TABLES, ids),
  ])

  const tagIds = productTagRows
    .map((row) => safeString((row as any).tagId ?? (row as any).tag_id))
    .filter(Boolean)
  const tagRows = tagIds.length ? await readByIds(TAG_TABLES, tagIds) : []
  const tagsById = new Map(tagRows.map((t) => [safeString((t as any).id), t]))

  const variantsByProduct = new Map<string, Array<Record<string, unknown>>>()
  for (const row of variantRows) {
    const pid = safeString((row as any).productId ?? (row as any).product_id)
    if (!pid) continue
    const list = variantsByProduct.get(pid) ?? []
    list.push(row)
    variantsByProduct.set(pid, list)
  }

  const categoriesByProduct = new Map<string, Array<Record<string, unknown>>>()
  for (const row of categoryRows) {
    const pid = safeString((row as any).productId ?? (row as any).product_id)
    if (!pid) continue
    const list = categoriesByProduct.get(pid) ?? []
    list.push(row)
    categoriesByProduct.set(pid, list)
  }

  const tagsByProduct = new Map<string, Array<Record<string, unknown>>>()
  for (const row of productTagRows) {
    const pid = safeString((row as any).productId ?? (row as any).product_id)
    if (!pid) continue
    const tagId = safeString((row as any).tagId ?? (row as any).tag_id)
    const tag = tagId ? tagsById.get(tagId) : null
    if (!tag) continue
    const list = tagsByProduct.get(pid) ?? []
    list.push(tag)
    tagsByProduct.set(pid, list)
  }

  return items.map((row) => {
    const id = safeString((row as any).id)
    const variants = variantsByProduct.get(id) ?? []
    const cats = categoriesByProduct.get(id) ?? []
    const tags = tagsByProduct.get(id) ?? []
    return {
      ...row,
      variants,
      categories: shapeCategories(cats),
      tags: shapeTags(tags),
    }
  })
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
  const base = await normalizeActorFks(withTimestampsForInsert(input.base))
  const created = await insertFirst(PRODUCT_TABLES, [
    base,
    // snake_case fallback
    Object.fromEntries(Object.entries(base).map(([k, v]) => [camelToSnake(k), v])),
  ])
  const productId = safeString(created.row?.id)
  if (!productId) {
    logger.error("Supabase insert failed for table 'Product' with payload", {
      payload: base,
      errors: created.errors.slice(0, 5),
    })
    const detail = created.errors.length ? ` (${created.errors.slice(0, 3).join(" | ")})` : ""
    throw new Error(`Unable to create product via Supabase${detail}`)
  }

  if (input.categoryId) {
    const linked = await insertFirstNoId(PRODUCT_CATEGORY_TABLES, [{ productId, categoryId: input.categoryId }])
    if (!linked.ok) {
      logger.error("Supabase insert failed for table 'ProductCategory' with payload", {
        productId,
        categoryId: input.categoryId,
        errors: linked.errors.slice(0, 5),
      })
    }
  }

  for (const v of input.variants ?? []) {
    const createdVariant = await insertFirst(PRODUCT_VARIANT_TABLES, [
      withId({ ...v, productId }),
      withId({ ...v, product_id: productId }),
    ])
    if (!createdVariant.row) {
      logger.error("Supabase insert failed for table 'ProductVariant' with payload", {
        productId,
        sku: (v as any)?.sku,
        errors: createdVariant.errors.slice(0, 5),
      })
    }
  }

  for (const [i, url] of (input.images ?? []).entries()) {
    await insertFirst(PRODUCT_IMAGE_TABLES, [
      withId({ productId, url, position: i }),
      withId({ product_id: productId, url, position: i }),
    ])
  }

  for (const f of input.features ?? []) {
    await insertFirst(PRODUCT_FEATURE_TABLES, [
      withId({ productId, title: f.title, icon: f.icon ?? null }),
      withId({ product_id: productId, title: f.title, icon: f.icon ?? null }),
    ])
  }

  for (const l of input.labels ?? []) {
    await insertFirst(PRODUCT_LABEL_TABLES, [
      withId({ productId, label: l.label, color: l.color ?? null }),
      withId({ product_id: productId, label: l.label, color: l.color ?? null }),
    ])
  }

  for (const [i, d] of (input.details ?? []).entries()) {
    await insertFirst(PRODUCT_DETAIL_TABLES, [
      withId({ productId, title: d.title, content: d.content, sortOrder: d.sortOrder ?? i }),
      withId({ product_id: productId, title: d.title, content: d.content, sort_order: d.sortOrder ?? i }),
    ])
  }

  for (const [i, s] of (input.sections ?? []).entries()) {
    await insertFirst(PRODUCT_SECTION_TABLES, [
      withId({ productId, title: s.title, description: s.description, sortOrder: s.sortOrder ?? i, isActive: s.isActive ?? true }),
      withId({ product_id: productId, title: s.title, description: s.description, sort_order: s.sortOrder ?? i, is_active: s.isActive ?? true }),
    ])
  }

  for (const raw of input.tags ?? []) {
    const name = safeString(raw).toLowerCase()
    if (!name) continue
    const slug = name.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    let tagId = ""
    const createdTag = await insertFirst(TAG_TABLES, [withId({ name, slug })])
    tagId = safeString(createdTag.row?.id)
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
      const linked = await insertFirstNoId(PRODUCT_TAG_TABLES, [{ productId, tagId }])
      if (!linked.ok) {
        logger.error("Supabase insert failed for table 'ProductTag' with payload", {
          productId,
          tagId,
          errors: linked.errors.slice(0, 5),
        })
      }
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
  const baseUpdate = await normalizeActorFks(withTimestampForUpdate(input.baseUpdate))
  const updated = await updateFirst(
    PRODUCT_TABLES,
    [
      baseUpdate,
      Object.fromEntries(
        Object.entries(baseUpdate).map(([k, v]) => [camelToSnake(k), v]),
      ),
    ],
    input.productId,
  )
  if (!updated.ok) {
    logger.error("Supabase product base update failed", {
      productId: input.productId,
      errors: updated.errors,
      fields: Object.keys(baseUpdate),
    })
    const detail = updated.errors.length ? ` (${updated.errors.slice(0, 3).join(" | ")})` : ""
    throw new Error(`Unable to update base product via Supabase${detail}`)
  }

  if (input.categoryId !== undefined) {
    await deleteByProductId(PRODUCT_CATEGORY_TABLES, input.productId)
    if (input.categoryId) {
      const linked = await insertFirstNoId(PRODUCT_CATEGORY_TABLES, [{ productId: input.productId, categoryId: input.categoryId }])
      if (!linked.ok) {
        logger.error("Supabase insert failed for table 'ProductCategory' with payload", {
          productId: input.productId,
          categoryId: input.categoryId,
          errors: linked.errors.slice(0, 5),
        })
      }
    }
  }
  if (input.variants !== undefined) {
    await deleteByProductId(PRODUCT_VARIANT_TABLES, input.productId)
    for (const v of input.variants ?? []) {
      await insertFirst(PRODUCT_VARIANT_TABLES, [withId({ ...v, productId: input.productId }), withId({ ...v, product_id: input.productId })])
    }
  }
  if (input.images !== undefined) {
    await deleteByProductId(PRODUCT_IMAGE_TABLES, input.productId)
    for (const [i, url] of (input.images ?? []).entries()) {
      await insertFirst(PRODUCT_IMAGE_TABLES, [
        withId({ productId: input.productId, url, position: i }),
        withId({ product_id: input.productId, url, position: i }),
      ])
    }
  }
  if (input.features !== undefined) {
    await deleteByProductId(PRODUCT_FEATURE_TABLES, input.productId)
    for (const f of input.features ?? []) {
      await insertFirst(PRODUCT_FEATURE_TABLES, [
        withId({ productId: input.productId, title: f.title, icon: f.icon ?? null }),
        withId({ product_id: input.productId, title: f.title, icon: f.icon ?? null }),
      ])
    }
  }
  if (input.labels !== undefined) {
    await deleteByProductId(PRODUCT_LABEL_TABLES, input.productId)
    for (const l of input.labels ?? []) {
      await insertFirst(PRODUCT_LABEL_TABLES, [
        withId({ productId: input.productId, label: l.label, color: l.color ?? null }),
        withId({ product_id: input.productId, label: l.label, color: l.color ?? null }),
      ])
    }
  }
  if (input.details !== undefined) {
    await deleteByProductId(PRODUCT_DETAIL_TABLES, input.productId)
    for (const [i, d] of (input.details ?? []).entries()) {
      await insertFirst(PRODUCT_DETAIL_TABLES, [
        withId({ productId: input.productId, title: d.title, content: d.content, sortOrder: d.sortOrder ?? i }),
        withId({ product_id: input.productId, title: d.title, content: d.content, sort_order: d.sortOrder ?? i }),
      ])
    }
  }
  if (input.sections !== undefined) {
    await deleteByProductId(PRODUCT_SECTION_TABLES, input.productId)
    for (const [i, s] of (input.sections ?? []).entries()) {
      await insertFirst(PRODUCT_SECTION_TABLES, [
        withId({
          productId: input.productId,
          title: s.title,
          description: s.description,
          sortOrder: s.sortOrder ?? i,
          isActive: s.isActive ?? true,
        }),
        withId({
          product_id: input.productId,
          title: s.title,
          description: s.description,
          sort_order: s.sortOrder ?? i,
          is_active: s.isActive ?? true,
        }),
      ])
    }
  }
  if (input.tags !== undefined) {
    await deleteByProductId(PRODUCT_TAG_TABLES, input.productId)
    for (const raw of input.tags ?? []) {
      const name = safeString(raw).toLowerCase()
      if (!name) continue
      const slug = name.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
      let tagId = safeString((await insertFirst(TAG_TABLES, [withId({ name, slug })])).row?.id)
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
        const linked = await insertFirstNoId(PRODUCT_TAG_TABLES, [{ productId: input.productId, tagId }])
        if (!linked.ok) {
          logger.error("Supabase insert failed for table 'ProductTag' with payload", {
            productId: input.productId,
            tagId,
            errors: linked.errors.slice(0, 5),
          })
        }
      }
    }
  }
  return { id: input.productId }
}

