"use client"

import { FormEvent, useEffect, useState } from "react"
import { authedFetch } from "@/lib/dashboard-fetch"
import { useMasterValues } from "@/hooks/useMasterData"

type ProductLite = { id: string; name: string; slug: string }
type DiscountRow = {
  id: string
  product_id: string
  discount_type: "percentage" | "flat"
  discount_value: number
  start_date: string | null
  end_date: string | null
  is_stackable: boolean
}

export default function ProductDiscountsPage() {
  const discountTypeMasterQuery = useMasterValues("DISCOUNT_TYPE")
  const discountTypeOptions =
    discountTypeMasterQuery.data?.length
      ? discountTypeMasterQuery.data.map((item) => ({ label: item.label, value: item.value }))
      : [
          { label: "Percentage", value: "percentage" },
          { label: "Flat", value: "flat" },
        ]
  const [products, setProducts] = useState<ProductLite[]>([])
  const [discounts, setDiscounts] = useState<DiscountRow[]>([])
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    productId: "",
    discountType: "percentage" as "percentage" | "flat",
    discountValue: "0",
    startDate: "",
    endDate: "",
    isStackable: false,
  })

  const load = async () => {
    try {
      setError("")
      const [productPayload, discountPayload] = await Promise.all([
        authedFetch<{ items: ProductLite[] }>("/api/v1/products?page=1&limit=200"),
        authedFetch<DiscountRow[]>("/api/admin/product-discounts"),
      ])
      setProducts(productPayload.items ?? [])
      setDiscounts(discountPayload ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const onCreate = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError("")
    try {
      await authedFetch("/api/admin/product-discounts", {
        method: "POST",
        body: JSON.stringify({
          productId: form.productId,
          discountType: form.discountType,
          discountValue: Number(form.discountValue),
          startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
          endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
          isStackable: form.isStackable,
        }),
      })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="mx-auto max-w-7xl space-y-4">
      <div>
        <h1 className="font-melon text-2xl font-bold text-[#4A1D1F]">Product Discounts (V2)</h1>
        <p className="text-sm text-[#646464]">Manage scheduled product-level discounts and coupon stacking.</p>
      </div>
      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      <form onSubmit={onCreate} className="grid gap-2 rounded border bg-white p-4 md:grid-cols-4">
        <select className="rounded border px-3 py-2 text-sm" value={form.productId} onChange={(e) => setForm((prev) => ({ ...prev, productId: e.target.value }))}>
          <option value="">Select product</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>{product.name}</option>
          ))}
        </select>
        <select className="rounded border px-3 py-2 text-sm" value={form.discountType} onChange={(e) => setForm((prev) => ({ ...prev, discountType: e.target.value as "percentage" | "flat" }))}>
          {discountTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <input className="rounded border px-3 py-2 text-sm" type="number" value={form.discountValue} onChange={(e) => setForm((prev) => ({ ...prev, discountValue: e.target.value }))} placeholder="Value" />
        <label className="flex items-center gap-2 text-xs font-semibold uppercase">
          <input type="checkbox" checked={form.isStackable} onChange={(e) => setForm((prev) => ({ ...prev, isStackable: e.target.checked }))} />
          stackable
        </label>
        <input className="rounded border px-3 py-2 text-sm" type="datetime-local" value={form.startDate} onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))} />
        <input className="rounded border px-3 py-2 text-sm" type="datetime-local" value={form.endDate} onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))} />
        <button disabled={saving} className="rounded-full bg-[#7B3010] px-4 py-2 text-xs font-semibold uppercase text-white disabled:opacity-40">Add Discount</button>
      </form>
      <div className="rounded border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-[#FFFBF3]">
            <tr>
              <th className="px-3 py-2 text-left">Product</th>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-left">Value</th>
              <th className="px-3 py-2 text-left">Stackable</th>
            </tr>
          </thead>
          <tbody>
            {discounts.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="px-3 py-2">{products.find((product) => product.id === row.product_id)?.name ?? row.product_id}</td>
                <td className="px-3 py-2">{row.discount_type}</td>
                <td className="px-3 py-2">{Number(row.discount_value)}</td>
                <td className="px-3 py-2">{row.is_stackable ? "Yes" : "No"}</td>
              </tr>
            ))}
            {!discounts.length && (
              <tr><td className="px-3 py-6 text-center text-[#646464]" colSpan={4}>No product discounts.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
