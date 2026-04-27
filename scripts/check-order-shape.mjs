// Quick check that orders + items + product hydration work end-to-end via Supabase.
//   node --env-file=.env scripts/check-order-shape.mjs <orderId>
import { createClient } from "@supabase/supabase-js"

const orderId = process.argv[2]
if (!orderId) {
  console.error("Usage: node --env-file=.env scripts/check-order-shape.mjs <orderId>")
  process.exit(1)
}

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
const sb = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const { data: order, error: orderErr } = await sb
  .from("Order")
  .select("*")
  .eq("id", orderId)
  .maybeSingle()
if (orderErr) throw orderErr
if (!order) {
  console.error("Order not found")
  process.exit(2)
}

const { data: items = [], error: itemErr } = await sb
  .from("OrderItem")
  .select("*")
  .eq("orderId", orderId)
if (itemErr) throw itemErr

const productIds = [...new Set(items.map((it) => it.productId).filter(Boolean))]
const { data: products = [], error: pErr } = productIds.length
  ? await sb.from("Product").select("id,name,slug").in("id", productIds)
  : { data: [], error: null }
if (pErr) throw pErr
const productById = new Map(products.map((p) => [p.id, p]))

const hydrated = items.map((it) => ({
  id: it.id,
  quantity: it.quantity,
  productId: it.productId,
  product: productById.get(it.productId) ?? null,
}))

console.log(
  JSON.stringify(
    {
      orderId: order.id,
      status: order.status,
      itemCount: hydrated.length,
      hydratedItems: hydrated,
      missingProducts: hydrated.filter((it) => !it.product).length,
    },
    null,
    2,
  ),
)
