"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { authedFetch, authedPost } from "@/lib/dashboard-fetch"

type ProductLite = { id: string; name: string; slug: string }

export default function AdminCreateComboPage() {
  const [name, setName] = useState("")
  const [pricingMode, setPricingMode] = useState<"fixed" | "dynamic">("fixed")
  const [comboPrice, setComboPrice] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [items, setItems] = useState<Array<{ productId: string; quantity: number }>>([{ productId: "", quantity: 1 }])
  const [products, setProducts] = useState<ProductLite[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const canSave = useMemo(() => {
    if (!(name.trim().length >= 2 && items.some((i) => i.productId && i.quantity > 0))) return false
    if (pricingMode === "fixed") {
      const n = Number(comboPrice)
      return Number.isFinite(n) && n > 0
    }
    return true
  }, [name, items, pricingMode, comboPrice])

  const loadProducts = async () => {
    setLoadingProducts(true)
    setError("")
    try {
      const res = await authedFetch<{ items?: any[] }>("/api/v1/products?page=1&limit=200")
      const rows = (res as any)?.items ?? (res as any)?.data?.items ?? []
      const lite = (Array.isArray(rows) ? rows : [])
        .filter((p) => p?.id && p?.name && p?.slug)
        .map((p) => ({ id: String(p.id), name: String(p.name), slug: String(p.slug) }))
      setProducts(lite)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load products")
    } finally {
      setLoadingProducts(false)
    }
  }

  const save = async () => {
    if (!canSave) return
    setSaving(true)
    setError("")
    try {
      await authedPost("/api/v1/bundles", {
        name: name.trim(),
        pricingMode,
        comboPrice: pricingMode === "fixed" ? Number(comboPrice) : null,
        isCombo: true,
        isActive,
        items: items.filter((i) => i.productId && i.quantity > 0).map((i, idx) => ({ productId: i.productId, quantity: i.quantity, sortOrder: idx })),
      })
      window.location.href = "/admin/products/combos"
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create combo")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="mx-auto w-full max-w-7xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-melon text-2xl font-bold text-[#4A1D1F]">Create Combo</h1>
          <p className="text-sm text-[#646464]">Create a combo product from existing products.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/products/combos"
            className="rounded-full border border-[#E8DCC8] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#4A1D1F] hover:bg-[#FFFBF3]"
          >
            Back
          </Link>
        </div>
      </div>

      {error ? <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}

      <div className="rounded-2xl border border-[#E8DCC8] bg-white p-5 md:p-6 space-y-4 min-h-[calc(100vh-220px)]">
        <label className="block text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#7A7A7A]">Combo name</span>
          <input className="mt-1 w-full rounded border px-3 py-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Family Combo Pack" />
        </label>

        <div className="grid gap-3 md:grid-cols-3">
          <label className="block text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#7A7A7A]">Pricing mode</span>
            <select className="mt-1 w-full rounded border px-3 py-2 text-sm" value={pricingMode} onChange={(e) => setPricingMode(e.target.value as any)}>
              <option value="fixed">Fixed</option>
              <option value="dynamic">Dynamic</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#7A7A7A]">Combo price</span>
            <input
              className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-50"
              type="number"
              min={1}
              step="0.01"
              value={comboPrice}
              onChange={(e) => setComboPrice(e.target.value)}
              placeholder="e.g. 499"
              disabled={pricingMode !== "fixed"}
            />
          </label>
          <label className="flex items-center gap-2 text-sm pt-6">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active
          </label>
          <button
            type="button"
            onClick={() => void loadProducts()}
            disabled={loadingProducts}
            className="mt-6 rounded-full border bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#4A1D1F] hover:bg-[#FFFBF3] disabled:opacity-60"
          >
            {loadingProducts ? "Loading…" : products.length ? "Reload products" : "Load products"}
          </button>
        </div>

        <div className="pt-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#7A7A7A]">Items</p>
          <div className="mt-2 space-y-2">
            {items.map((row, idx) => (
              <div key={idx} className="grid gap-2 md:grid-cols-[1fr_120px_120px]">
                <select
                  className="w-full rounded border px-3 py-2 text-sm"
                  value={row.productId}
                  onChange={(e) =>
                    setItems((p) => p.map((x, i) => (i === idx ? { ...x, productId: e.target.value } : x)))
                  }
                >
                  <option value="">Select product…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <input
                  className="w-full rounded border px-3 py-2 text-sm"
                  type="number"
                  min={1}
                  value={row.quantity}
                  onChange={(e) =>
                    setItems((p) =>
                      p.map((x, i) => (i === idx ? { ...x, quantity: Math.max(1, Number(e.target.value || 1)) } : x)),
                    )
                  }
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="w-full rounded border px-3 py-2 text-xs font-semibold uppercase tracking-wide hover:bg-[#FFFBF3]"
                    onClick={() => setItems((p) => p.filter((_, i) => i !== idx))}
                    disabled={items.length <= 1}
                  >
                    Remove
                  </button>
                  <button
                    type="button"
                    className="w-full rounded border px-3 py-2 text-xs font-semibold uppercase tracking-wide hover:bg-[#FFFBF3]"
                    onClick={() => setItems((p) => [...p, { productId: "", quantity: 1 }])}
                  >
                    Add
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={() => void save()}
            disabled={!canSave || saving}
            className="rounded-full bg-[#7B3010] px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white disabled:opacity-50"
          >
            {saving ? "Creating…" : "Create combo"}
          </button>
        </div>
      </div>
    </section>
  )
}

