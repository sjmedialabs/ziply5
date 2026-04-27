// End-to-end smoke test for the Supabase REST paths used by products & orders.
// Mirrors what listProductsSupabaseBasic / listOrderIdsSupabase do internally.
import { createClient } from "@supabase/supabase-js"

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error("Missing SUPABASE_URL / service role key")
  process.exit(1)
}

const sb = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const checks = [
  ["Product", () => sb.from("Product").select("id,name,status", { count: "exact" }).limit(3)],
  ["Order", () => sb.from("Order").select("id,status", { count: "exact" }).limit(3)],
  ["OrderItem", () => sb.from("OrderItem").select("id", { count: "exact" }).limit(3)],
  ["ProductVariant", () => sb.from("ProductVariant").select("id", { count: "exact" }).limit(3)],
  ["ProductImage", () => sb.from("ProductImage").select("id", { count: "exact" }).limit(3)],
  ["ProductCategory", () => sb.from("ProductCategory").select("productId,categoryId", { count: "exact" }).limit(3)],
  ["User", () => sb.from("User").select("id", { count: "exact" }).limit(3)],
  ["Transaction", () => sb.from("Transaction").select("id", { count: "exact" }).limit(3)],
]

let failed = 0
for (const [name, run] of checks) {
  const { data, error, count } = await run()
  if (error) {
    failed += 1
    console.error(`FAIL ${name}: ${error.message}`)
  } else {
    console.log(`OK   ${name}: count=${count ?? "?"} sample=${JSON.stringify(data?.[0] ?? null)}`)
  }
}

process.exit(failed === 0 ? 0 : 1)
