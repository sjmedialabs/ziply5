"use client"

import { FormEvent, useEffect, useState } from "react"
import { authedFetch } from "@/lib/dashboard-fetch"

type ReturnItem = {
  id: string
  order_id: string
  order_item_id: string
  type: "return" | "replace"
  reason: string
  status: string
  created_at: string
}

export default function MyReturnsPage() {
  const [items, setItems] = useState<ReturnItem[]>([])
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    orderId: "",
    orderItemId: "",
    type: "return" as "return" | "replace",
    reason: "Damaged",
    notes: "",
  })

  const load = async () => {
    try {
      setError("")
      const rows = await authedFetch<ReturnItem[]>("/api/returns/my")
      setItems(rows)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError("")
    try {
      await authedFetch("/api/returns/request-v2", {
        method: "POST",
        body: JSON.stringify(form),
      })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit return/replace request")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="mx-auto max-w-5xl space-y-4 px-4 py-6">
      <div>
        <h1 className="font-melon text-2xl font-bold text-[#4A1D1F]">My Returns / Replacements</h1>
        <p className="text-sm text-[#646464]">Raise requests and track lifecycle updates.</p>
      </div>
      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

      <form onSubmit={submit} className="grid gap-2 rounded border bg-white p-4 md:grid-cols-2">
        <input className="rounded border px-3 py-2 text-sm" placeholder="Order ID" value={form.orderId} onChange={(e) => setForm((prev) => ({ ...prev, orderId: e.target.value }))} />
        <input className="rounded border px-3 py-2 text-sm" placeholder="Order Item ID" value={form.orderItemId} onChange={(e) => setForm((prev) => ({ ...prev, orderItemId: e.target.value }))} />
        <select className="rounded border px-3 py-2 text-sm" value={form.type} onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as "return" | "replace" }))}>
          <option value="return">Return</option>
          <option value="replace">Replace</option>
        </select>
        <select className="rounded border px-3 py-2 text-sm" value={form.reason} onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}>
          <option value="Damaged">Damaged</option>
          <option value="Wrong Product">Wrong Product</option>
          <option value="Not Satisfied">Not Satisfied</option>
          <option value="Other">Other</option>
        </select>
        <textarea className="rounded border px-3 py-2 text-sm md:col-span-2" rows={3} placeholder="Optional notes" value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} />
        <button disabled={saving} className="rounded-full bg-[#7B3010] px-4 py-2 text-xs font-semibold uppercase text-white disabled:opacity-40">Submit Request</button>
      </form>

      <div className="rounded border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-[#FFFBF3]">
            <tr>
              <th className="px-3 py-2 text-left">Order</th>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-left">Reason</th>
              <th className="px-3 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="px-3 py-2 font-mono text-xs">{item.order_id.slice(0, 8)}...</td>
                <td className="px-3 py-2">{item.type}</td>
                <td className="px-3 py-2">{item.reason}</td>
                <td className="px-3 py-2">{item.status}</td>
              </tr>
            ))}
            {!items.length && <tr><td className="px-3 py-6 text-center text-[#646464]" colSpan={4}>No requests yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  )
}
