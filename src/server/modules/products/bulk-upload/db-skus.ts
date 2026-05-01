import { getSupabaseAdmin } from "@/src/lib/supabase/admin"

const PRODUCT_TABLES = ["Product", "products", "product"]
const VARIANT_TABLES = ["ProductVariant", "product_variants"]

export const loadExistingSkus = async (): Promise<Set<string>> => {
  const set = new Set<string>()
  const client = getSupabaseAdmin()
  for (const table of PRODUCT_TABLES) {
    const { data, error } = await client.from(table).select("sku")
    if (error) continue
    for (const row of data ?? []) {
      const sku = String((row as { sku?: string }).sku ?? "").trim().toLowerCase()
      if (sku) set.add(sku)
    }
  }
  for (const table of VARIANT_TABLES) {
    const { data, error } = await client.from(table).select("sku")
    if (error) continue
    for (const row of data ?? []) {
      const sku = String((row as { sku?: string }).sku ?? "").trim().toLowerCase()
      if (sku) set.add(sku)
    }
  }
  return set
}
