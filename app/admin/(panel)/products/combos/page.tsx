"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { authedFetch } from "@/lib/dashboard-fetch"

type BundleRow = {
  id: string
  name: string
  slug: string
  isActive?: boolean
  isCombo?: boolean
  pricingMode?: string
  comboPrice?: number | null
  updatedAt?: string
  items?: Array<{ id: string; quantity: number; product?: { name?: string } | null }>
}

export default function AdminCombosPage() {
  const [rows, setRows] = useState<BundleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    authedFetch<BundleRow[]>("/api/v1/bundles")
      .then((data) => {
        if (!cancelled) setRows(Array.isArray(data) ? data : [])
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-melon text-2xl font-bold text-[#4A1D1F]">Combos</h1>
          <p className="text-sm text-[#646464]">Combo products (bundles) built from multiple items.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/products"
            className="rounded-full border border-[#E8DCC8] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#4A1D1F] hover:bg-[#FFFBF3]"
          >
            Back to Products
          </Link>
          <Link
            href="/admin/products/combos/add"
            className="rounded-full bg-[#7B3010] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-[#5c2410]"
          >
            Create Combo
          </Link>
        </div>
      </div>

      {error ? <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}
      {loading ? <p className="text-sm text-[#646464]">Loading…</p> : null}

      {!loading ? (
        <div className="overflow-hidden rounded-2xl border border-[#E8DCC8] bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#FFFBF3] text-xs font-semibold uppercase tracking-wide text-[#7A7A7A]">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3">Active</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-[#646464]" colSpan={6}>
                    No combos yet.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-[#FFFBF3]/60">
                    <td className="px-4 py-3 font-semibold text-[#4A1D1F]">{r.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[#646464]">{r.slug}</td>
                    <td className="px-4 py-3 text-xs text-[#646464]">{r.items?.length ?? 0}</td>
                    <td className="px-4 py-3 text-xs text-[#646464]">
                      {r.pricingMode === "fixed" ? (r.comboPrice != null ? `Rs.${Number(r.comboPrice).toFixed(2)}` : "—") : "Dynamic"}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#646464]">{r.pricingMode ?? "fixed"}</td>
                    <td className="px-4 py-3 text-xs text-[#646464]">{r.isActive === false ? "No" : "Yes"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  )
}

