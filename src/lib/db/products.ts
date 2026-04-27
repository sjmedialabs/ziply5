import { getSupabaseAdmin } from "@/src/lib/supabase/admin"
import { readFromCandidateTables } from "@/src/lib/db/_shared"

type ProductRow = Record<string, unknown>

const PRODUCT_TABLES = ["Product", "products"]

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

  for (const table of PRODUCT_TABLES) {
    let query = client.from(table).select("*", { count: "exact" }).order("createdAt", { ascending: false }).range(offset, offset + limit - 1)
    if (input.status) query = query.eq("status", input.status)
    if (input.q?.trim()) query = query.or(`name.ilike.%${input.q.trim()}%,slug.ilike.%${input.q.trim()}%,sku.ilike.%${input.q.trim()}%`)
    const { data, error, count } = await query
    if (!error) {
      return { items: (data ?? []) as ProductRow[], total: count ?? 0, page, limit }
    }
  }
  throw new Error("Unable to list products via Supabase")
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

