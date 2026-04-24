"use client"

import { FormEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { authedFetch } from "@/lib/dashboard-fetch"
import { useMasterValues } from "@/hooks/useMasterData"

type SupportTicket = {
  id: string
  category: string
  subject: string
  status: string
  created_at: string
  last_message?: string | null
}

export default function SupportPage() {
  const categoryMasterQuery = useMasterValues("SUPPORT_CATEGORY")
  const categoryOptions =
    categoryMasterQuery.data?.length
      ? categoryMasterQuery.data.map((item) => ({ label: item.label, value: item.value }))
      : [
          { label: "Order Issue", value: "order_issue" },
          { label: "Payment Issue", value: "payment_issue" },
          { label: "Technical Issue", value: "technical_issue" },
        ]
  const router = useRouter()
  const [items, setItems] = useState<SupportTicket[]>([])
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    category: "order_issue" as "order_issue" | "payment_issue" | "technical_issue",
    orderId: "",
    subject: "",
    message: "",
  })

  const load = async () => {
    try {
      setError("")
      const rows = await authedFetch<SupportTicket[]>("/api/support/tickets")
      setItems(rows)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load support tickets")
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
      await authedFetch("/api/support/tickets", {
        method: "POST",
        body: JSON.stringify({
          category: form.category,
          orderId: form.orderId || null,
          subject: form.subject,
          message: form.message,
        }),
      })
      setForm({ category: "order_issue", orderId: "", subject: "", message: "" })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create ticket")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="mx-auto max-w-5xl space-y-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-melon text-2xl font-bold text-[#4A1D1F]">Support</h1>
          <p className="text-sm text-[#646464]">Raise and track your support tickets.</p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/profile")}
          className="rounded-full border border-[#E8DCC8] bg-white px-4 py-2 text-xs font-semibold uppercase text-[#4A1D1F]"
        >
          Back
        </button>
      </div>

      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

      <form onSubmit={onCreate} className="grid gap-2 rounded border bg-white p-4 md:grid-cols-2">
        <select className="rounded border px-3 py-2 text-sm" value={form.category} onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value as "order_issue" | "payment_issue" | "technical_issue" }))}>
          {categoryOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <input className="rounded border px-3 py-2 text-sm" placeholder="Order ID (optional)" value={form.orderId} onChange={(e) => setForm((prev) => ({ ...prev, orderId: e.target.value }))} />
        <input className="rounded border px-3 py-2 text-sm md:col-span-2" placeholder="Subject" value={form.subject} onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))} />
        <textarea className="rounded border px-3 py-2 text-sm md:col-span-2" rows={4} placeholder="Describe your issue" value={form.message} onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))} />
        <button disabled={saving} className="rounded-full bg-[#7B3010] px-4 py-2 text-xs font-semibold uppercase text-white disabled:opacity-40">Create Ticket</button>
      </form>

      <div className="rounded border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-[#FFFBF3]">
            <tr>
              <th className="px-3 py-2 text-left">Subject</th>
              <th className="px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Last Update</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="px-3 py-2">{item.subject}</td>
                <td className="px-3 py-2">{item.category}</td>
                <td className="px-3 py-2">{item.status}</td>
                <td className="px-3 py-2">{new Date(item.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {!items.length && <tr><td className="px-3 py-6 text-center text-[#646464]" colSpan={4}>No support tickets.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  )
}
