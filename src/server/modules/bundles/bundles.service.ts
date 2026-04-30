import crypto from "node:crypto"
import { pgQuery, pgTx } from "@/src/server/db/pg"

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

export const listBundles = async () => {
  const selectWithPrice = `
    SELECT
      b.id, b.name, b.slug, b."productId" as "productId", b."pricingMode" as "pricingMode",
      b."isCombo" as "isCombo", b."isActive" as "isActive", b."comboPrice" as "comboPrice",
      b."createdAt" as "createdAt", b."updatedAt" as "updatedAt",
      p.name as product_name, p.slug as product_slug
    FROM "Bundle" b
    LEFT JOIN "Product" p ON p.id = b."productId"
    ORDER BY b."updatedAt" DESC
  `
  const selectWithoutPrice = `
    SELECT
      b.id, b.name, b.slug, b."productId" as "productId", b."pricingMode" as "pricingMode",
      b."isCombo" as "isCombo", b."isActive" as "isActive", NULL::numeric as "comboPrice",
      b."createdAt" as "createdAt", b."updatedAt" as "updatedAt",
      p.name as product_name, p.slug as product_slug
    FROM "Bundle" b
    LEFT JOIN "Product" p ON p.id = b."productId"
    ORDER BY b."updatedAt" DESC
  `

  const bundles = await pgQuery<
    Array<{
      id: string
      name: string
      slug: string
      productId: string | null
      pricingMode: string
      isCombo: boolean
      isActive: boolean
      comboPrice: number | null
      createdAt: Date
      updatedAt: Date
      product_name: string | null
      product_slug: string | null
    }>
  >(selectWithPrice).catch(async (e: any) => {
    // Backward compatibility if combos-foundation.sql hasn't been applied yet.
    if (e?.code === "42703" && String(e?.message ?? "").includes("comboprice")) {
      return pgQuery(selectWithoutPrice)
    }
    throw e
  })

  const items = await pgQuery<
    Array<{
      id: string
      bundleId: string
      productId: string
      variantId: string | null
      quantity: number
      isOptional: boolean
      minSelect: number
      maxSelect: number | null
      sortOrder: number
      product_name: string | null
      product_slug: string | null
      variant_name: string | null
      variant_sku: string | null
    }>
  >(
    `
      SELECT
        bi.id, bi."bundleId" as "bundleId", bi."productId" as "productId", bi."variantId" as "variantId",
        bi.quantity, bi."isOptional" as "isOptional", bi."minSelect" as "minSelect", bi."maxSelect" as "maxSelect",
        bi."sortOrder" as "sortOrder",
        p.name as product_name, p.slug as product_slug,
        v.name as variant_name, v.sku as variant_sku
      FROM "BundleItem" bi
      LEFT JOIN "Product" p ON p.id = bi."productId"
      LEFT JOIN "ProductVariant" v ON v.id = bi."variantId"
      ORDER BY bi."bundleId" ASC, bi."sortOrder" ASC
    `,
  )

  const byBundle = new Map<string, any[]>()
  for (const it of items) {
    const arr = byBundle.get(it.bundleId) ?? []
    arr.push({
      id: it.id,
      bundleId: it.bundleId,
      productId: it.productId,
      variantId: it.variantId,
      quantity: it.quantity,
      isOptional: it.isOptional,
      minSelect: it.minSelect,
      maxSelect: it.maxSelect,
      sortOrder: it.sortOrder,
      product: it.product_name ? { id: it.productId, name: it.product_name, slug: it.product_slug } : null,
      variant: it.variant_name ? { id: it.variantId, name: it.variant_name, sku: it.variant_sku } : null,
    })
    byBundle.set(it.bundleId, arr)
  }

  return bundles.map((b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    productId: b.productId,
    pricingMode: b.pricingMode,
    isCombo: b.isCombo,
    isActive: b.isActive,
    comboPrice: b.comboPrice == null ? null : Number(b.comboPrice),
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
    product: b.product_name ? { id: b.productId, name: b.product_name, slug: b.product_slug } : null,
    items: byBundle.get(b.id) ?? [],
  }))
}

export const createBundle = async (input: {
  name: string
  slug?: string
  productId?: string | null
  pricingMode?: "fixed" | "dynamic"
  isCombo?: boolean
  isActive?: boolean
  comboPrice?: number | null
  items: Array<{
    productId: string
    variantId?: string | null
    quantity: number
    isOptional?: boolean
    minSelect?: number
    maxSelect?: number | null
    sortOrder?: number
  }>
}) => {
  const slug = slugify(input.slug ?? input.name)
  const bundleId = crypto.randomUUID()
  await pgTx(async (client) => {
    const valuesBase = [
      bundleId,
      input.name.trim(),
      slug,
      input.productId ?? null,
      input.pricingMode ?? "fixed",
      input.isCombo ?? true,
      input.isActive ?? true,
    ]

    // Prefer inserting comboPrice when the column exists; fall back safely if not migrated.
    await client
      .query(
        `
          INSERT INTO "Bundle" (id, name, slug, "productId", "pricingMode", "isCombo", "isActive", "comboPrice", "createdAt", "updatedAt")
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8, now(), now())
        `,
        [...valuesBase, input.comboPrice ?? null],
      )
      .catch(async (e: any) => {
        if (e?.code === "42703" && String(e?.message ?? "").includes("comboprice")) {
          await client.query(
            `
              INSERT INTO "Bundle" (id, name, slug, "productId", "pricingMode", "isCombo", "isActive", "createdAt", "updatedAt")
              VALUES ($1,$2,$3,$4,$5,$6,$7, now(), now())
            `,
            valuesBase,
          )
          return
        }
        throw e
      })
    for (const [idx, item] of input.items.entries()) {
      await client.query(
        `
          INSERT INTO "BundleItem"
            (id, "bundleId", "productId", "variantId", quantity, "isOptional", "minSelect", "maxSelect", "sortOrder")
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        `,
        [
          crypto.randomUUID(),
          bundleId,
          item.productId,
          item.variantId ?? null,
          item.quantity,
          item.isOptional ?? false,
          item.minSelect ?? 0,
          item.maxSelect ?? null,
          item.sortOrder ?? idx,
        ],
      )
    }
  })

  const created = (await listBundles()).find((b: any) => b.id === bundleId)
  if (!created) {
    // fallback minimal response
    return { id: bundleId, name: input.name.trim(), slug, items: input.items }
  }
  return created
}
