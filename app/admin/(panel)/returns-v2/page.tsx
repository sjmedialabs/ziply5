"use client"

import { useEffect, useState } from "react"
import { authedFetch } from "@/lib/dashboard-fetch"

type ReturnRow = {
  id: string
  order_id: string
  type: "return" | "replace"
  reason: string
  status:
    | "REQUESTED"
    | "APPROVED"
    | "PICKUP_INITIATED"
    | "RECEIVED"
    | "REFUND_INITIATED"
    | "REPLACEMENT_SHIPPED"
    | "COMPLETED"
    | "REJECTED"
}

const STATUSES: ReturnRow["status"][] = [
  "REQUESTED",
  "APPROVED",
  "PICKUP_INITIATED",
  "RECEIVED",
  "REFUND_INITIATED",
  "REPLACEMENT_SHIPPED",
  "COMPLETED",
  "REJECTED",
]

export default function AdminReturnsV2Page() {
  const [items, setItems] = useState<ReturnRow[]>([])
  const [draft, setDraft] = useState<Record<string, ReturnRow["status"]>>({})
  const [error, setError] = useState("")

  const load = async () => {
    try {
      setError("")
      const rows = await authedFetch<ReturnRow[]>("/api/admin/returns")
      setItems(rows)
      const next: Record<string, ReturnRow["status"]> = {}
      rows.forEach((row) => {
        next[row.id] = row.status
      })
      setDraft(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load return queue")
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const apply = async (id: string) => {
    try {
      setError("")
      await authedFetch(`/api/admin/returns/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: draft[id] }),
      })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update status")
    }
  }

  return (
    <section className="mx-auto max-w-7xl space-y-4">
      <div>
        <h1 className="font-melon text-2xl font-bold text-[#4A1D1F]">Return / Replace (V2)</h1>
        <p className="text-sm text-[#646464]">Approve and move requests through pickup, receiving, and completion.</p>
      </div>
      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      <div className="rounded border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-[#FFFBF3]">
            <tr>
              <th className="px-3 py-2 text-left">Order</th>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-left">Reason</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="px-3 py-2 font-mono text-xs">{item.order_id.slice(0, 8)}...</td>
                <td className="px-3 py-2 capitalize">{item.type}</td>
                <td className="px-3 py-2">{item.reason}</td>
                <td className="px-3 py-2">
                  <select
                    className="rounded border px-2 py-1 text-xs"
                    value={draft[item.id] ?? item.status}
                    onChange={(e) => setDraft((prev) => ({ ...prev, [item.id]: e.target.value as ReturnRow["status"] }))}
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <button className="rounded-full bg-[#7B3010] px-3 py-1 text-xs font-semibold uppercase text-white" onClick={() => void apply(item.id)}>
                    Apply
                  </button>
                </td>
              </tr>
            ))}
            {!items.length && <tr><td className="px-3 py-6 text-center text-[#646464]" colSpan={5}>No requests.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  )
}
