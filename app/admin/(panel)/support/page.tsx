"use client"

import { FormEvent, useEffect, useState } from "react"
import { authedFetch } from "@/lib/dashboard-fetch"
import { useMasterValues } from "@/hooks/useMasterData"

type Ticket = {
  id: string
  subject: string
  status: "open" | "in_progress" | "resolved" | "closed"
  user_email: string
  category: string
}

export default function AdminSupportV2Page() {
  const statusMasterQuery = useMasterValues("SUPPORT_STATUS")
  const statusOptions =
    statusMasterQuery.data?.length
      ? statusMasterQuery.data.map((item) => ({ label: item.label, value: item.value }))
      : [
          { label: "Open", value: "open" },
          { label: "In progress", value: "in_progress" },
          { label: "Resolved", value: "resolved" },
          { label: "Closed", value: "closed" },
        ]
  const [items, setItems] = useState<Ticket[]>([])
  const [ticketId, setTicketId] = useState("")
  const [status, setStatus] = useState<"open" | "in_progress" | "resolved" | "closed">("in_progress")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      setError("")
      const rows = await authedFetch<Ticket[]>("/api/admin/support")
      setItems(rows)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load support tickets")
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const reply = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError("")
    try {
      await authedFetch("/api/admin/support/reply", {
        method: "POST",
        body: JSON.stringify({ ticketId, status, message }),
      })
      setMessage("")
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send reply")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="mx-auto max-w-7xl space-y-4">
      <div>
        <h1 className="font-melon text-2xl font-bold text-[#4A1D1F]">Support (V2)</h1>
        <p className="text-sm text-[#646464]">Manage customer support lifecycle and replies.</p>
      </div>
      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      <div className="rounded border bg-white p-4">
        <table className="w-full text-sm">
          <thead className="bg-[#FFFBF3]">
            <tr>
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">Subject</th>
              <th className="px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-left">User</th>
              <th className="px-3 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="px-3 py-2 font-mono text-xs">{row.id.slice(0, 8)}...</td>
                <td className="px-3 py-2">{row.subject}</td>
                <td className="px-3 py-2">{row.category}</td>
                <td className="px-3 py-2">{row.user_email}</td>
                <td className="px-3 py-2">{row.status}</td>
              </tr>
            ))}
            {!items.length && <tr><td className="px-3 py-6 text-center text-[#646464]" colSpan={5}>No support tickets.</td></tr>}
          </tbody>
        </table>
      </div>
      <form onSubmit={reply} className="grid gap-2 rounded border bg-white p-4 md:grid-cols-4">
        <input className="rounded border px-3 py-2 text-sm md:col-span-2" placeholder="Ticket UUID" value={ticketId} onChange={(e) => setTicketId(e.target.value)} />
        <select className="rounded border px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value as "open" | "in_progress" | "resolved" | "closed")}>
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button disabled={saving} className="rounded-full bg-[#7B3010] px-4 py-2 text-xs font-semibold uppercase text-white disabled:opacity-40">Reply</button>
        <textarea className="rounded border px-3 py-2 text-sm md:col-span-4" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Reply message" />
      </form>
    </section>
  )
}
