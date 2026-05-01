"use client"

import { use, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { addToCart, getCartItems, setCartItemQuantity } from "@/lib/cart"

type BundleProduct = { productId: string; name: string; slug: string; price: number; thumbnail?: string | null }
type BundleDetail = {
  id: string
  name: string
  slug: string
  image?: string | null
  description?: string | null
  pricingMode: "fixed" | "dynamic"
  comboPrice?: number | null
  effectivePrice: number
  dynamicPrice: number
  savings: number
  products: BundleProduct[]
}

export default function ComboDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [bundle, setBundle] = useState<BundleDetail | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const qty = useMemo(
    () => getCartItems().filter((x) => x.slug === slug && !x.productId).reduce((sum, x) => sum + x.quantity, 0),
    [slug],
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/v1/bundles/by-slug/${encodeURIComponent(slug)}`)
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (cancelled) return
        if (!ok) throw new Error(j?.message ?? "Unable to load combo")
        setBundle(j?.data ?? null)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Unable to load combo")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  const addCombo = () => {
    if (!bundle) return
    addToCart(
      {
        slug: bundle.slug,
        name: bundle.name,
        variantId: null,
        price: Number(bundle.effectivePrice || 0),
        image: bundle.image || bundle.products[0]?.thumbnail || "/placeholder.jpg",
        weight: `${bundle.products.length} items`,
      },
      1,
    )
  }

  if (loading) return <section className="mx-auto max-w-5xl px-4 py-10 text-sm text-[#646464]">Loading combo...</section>
  if (!bundle || error) return <section className="mx-auto max-w-5xl px-4 py-10 text-sm text-red-700">{error || "Combo not found"}</section>

  return (
    <section className="mx-auto max-w-5xl space-y-5 px-4 py-8">
      <Link href="/products?type=combo" className="text-xs font-semibold uppercase tracking-wide text-[#7B3010] hover:underline">
        Back to combos
      </Link>
      <div className="grid gap-6 rounded-2xl border border-[#E8DCC8] bg-white p-5 md:grid-cols-[300px_1fr]">
        <div className="relative h-72 overflow-hidden rounded-xl bg-[#FFFBF3]">
          <Image src={bundle.image || bundle.products[0]?.thumbnail || "/placeholder.jpg"} alt={bundle.name} fill className="object-contain p-3" />
        </div>
        <div className="space-y-3">
          <h1 className="font-melon text-3xl font-bold text-[#4A1D1F]">{bundle.name}</h1>
          <p className="text-sm text-[#646464]">{bundle.description || "Combo bundle of selected products."}</p>
          <div className="rounded-xl border border-[#E8DCC8] bg-[#FFFBF3] p-3 text-sm">
            <p>Price: Rs.{Number(bundle.effectivePrice).toFixed(2)}</p>
            <p>Regular total: Rs.{Number(bundle.dynamicPrice).toFixed(2)}</p>
            <p className="font-semibold text-[#7B3010]">Savings: Rs.{Number(bundle.savings).toFixed(2)}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={addCombo} className="rounded-full bg-[#7B3010] px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white">
              Add Combo To Cart
            </button>
            {qty > 0 ? (
              <button
                onClick={() =>
                  setCartItemQuantity(
                    { slug: bundle.slug, name: bundle.name, variantId: null, price: Number(bundle.effectivePrice), image: bundle.image || "/placeholder.jpg", weight: `${bundle.products.length} items` },
                    qty + 1,
                  )
                }
                className="rounded-full border border-[#E8DCC8] px-4 py-2 text-xs font-semibold uppercase tracking-wide"
              >
                In cart: {qty}
              </button>
            ) : null}
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-[#E8DCC8] bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#7A7A7A]">Included products</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {bundle.products.map((p) => (
            <Link key={p.productId} href={`/product/${p.slug}`} className="rounded-lg border border-[#E8DCC8] p-3 hover:bg-[#FFFBF3]">
              <p className="font-semibold text-[#4A1D1F]">{p.name}</p>
              <p className="text-xs text-[#646464]">Rs.{Number(p.price).toFixed(2)}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
