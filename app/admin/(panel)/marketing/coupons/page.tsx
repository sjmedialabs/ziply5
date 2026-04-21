"use client"

import { FormEvent, useEffect, useState } from "react"
import { authedFetch } from "@/lib/dashboard-fetch"

type CouponRow = {
  id: string
  code: string
  description: string | null
  discount_type: "percentage" | "flat"
  discount_value: number
  min_order_value: number | null
  max_discount: number | null
  usage_limit: number | null
  usage_per_user: number | null
  expiry_date: string | null
  status: boolean
}

export default function MarketingCouponsPage() {
  const [items, setItems] = useState<CouponRow[]>([])
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    code: "",
    description: "",
    discountType: "percentage" as "percentage" | "flat",
    discountValue: "0",
    minOrderValue: "0",
    maxDiscount: "",
    usageLimit: "",
    usagePerUser: "",
    expiryDate: "",
  })

  const load = async () => {
    try {
      setError("")
      const rows = await authedFetch<CouponRow[]>("/api/admin/coupons")
      setItems(rows)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load coupons")
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
      await authedFetch("/api/admin/coupons", {
        method: "POST",
        body: JSON.stringify({
          code: form.code,
          description: form.description || null,
          discountType: form.discountType,
          discountValue: Number(form.discountValue),
          minOrderValue: Number(form.minOrderValue || 0),
          maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : null,
          usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
          usagePerUser: form.usagePerUser ? Number(form.usagePerUser) : null,
          expiryDate: form.expiryDate ? new Date(form.expiryDate).toISOString() : null,
        }),
      })
      setForm({
        code: "",
        description: "",
        discountType: "percentage",
        discountValue: "0",
        minOrderValue: "0",
        maxDiscount: "",
        usageLimit: "",
        usagePerUser: "",
        expiryDate: "",
      })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create coupon")
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async (id: string, status: boolean) => {
    setSaving(true)
    setError("")
    try {
      await authedFetch(`/api/admin/coupons/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: !status }),
      })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update status")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="mx-auto max-w-7xl space-y-4">
      <div>
        <h1 className="font-melon text-2xl font-bold text-[#4A1D1F]">Marketing Coupons (V2)</h1>
        <p className="text-sm text-[#646464]">Create, activate, and monitor coupon configurations.</p>
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      <form onSubmit={onCreate} className="grid gap-2 rounded-xl border bg-white p-4 md:grid-cols-4">
        <input className="rounded border px-3 py-2 text-sm" placeholder="Code" value={form.code} onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))} />
        <input className="rounded border px-3 py-2 text-sm" placeholder="Description" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
        <select className="rounded border px-3 py-2 text-sm" value={form.discountType} onChange={(e) => setForm((prev) => ({ ...prev, discountType: e.target.value as "percentage" | "flat" }))}>
          <option value="percentage">Percentage</option>
          <option value="flat">Flat</option>
        </select>
        <input className="rounded border px-3 py-2 text-sm" type="number" placeholder="Discount Value" value={form.discountValue} onChange={(e) => setForm((prev) => ({ ...prev, discountValue: e.target.value }))} />
        <input className="rounded border px-3 py-2 text-sm" type="number" placeholder="Min Order" value={form.minOrderValue} onChange={(e) => setForm((prev) => ({ ...prev, minOrderValue: e.target.value }))} />
        <input className="rounded border px-3 py-2 text-sm" type="number" placeholder="Max Discount" value={form.maxDiscount} onChange={(e) => setForm((prev) => ({ ...prev, maxDiscount: e.target.value }))} />
        <input className="rounded border px-3 py-2 text-sm" type="number" placeholder="Usage Limit" value={form.usageLimit} onChange={(e) => setForm((prev) => ({ ...prev, usageLimit: e.target.value }))} />
        <input className="rounded border px-3 py-2 text-sm" type="number" placeholder="Per User Limit" value={form.usagePerUser} onChange={(e) => setForm((prev) => ({ ...prev, usagePerUser: e.target.value }))} />
        <input className="rounded border px-3 py-2 text-sm md:col-span-2" type="datetime-local" value={form.expiryDate} onChange={(e) => setForm((prev) => ({ ...prev, expiryDate: e.target.value }))} />
        <button disabled={saving} className="rounded-full bg-[#7B3010] px-4 py-2 text-xs font-semibold uppercase text-white disabled:opacity-40">Create Coupon</button>
      </form>

      <div className="rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-[#FFFBF3] text-left">
            <tr>
              <th className="px-3 py-2">Code</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Value</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="px-3 py-2">{item.code}</td>
                <td className="px-3 py-2">{item.discount_type}</td>
                <td className="px-3 py-2">{Number(item.discount_value)}</td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => void toggleStatus(item.id, item.status)}
                    className="rounded-full border px-3 py-1 text-xs"
                  >
                    {item.status ? "Active" : "Inactive"}
                  </button>
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td className="px-3 py-6 text-center text-[#646464]" colSpan={4}>No coupons yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
