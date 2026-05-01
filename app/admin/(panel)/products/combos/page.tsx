"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { authedDelete, authedFetch, authedPatch } from "@/lib/dashboard-fetch"

type BundleRow = {
  id: string
  name: string
  slug: string
  isActive: boolean
  pricingMode: "fixed" | "dynamic"
  comboPrice?: number | null
  effectivePrice: number
  savings: number
  includedProductsCount: number
  createdAt: string
}

export default function AdminCombosPage() {
  const [rows, setRows] = useState<BundleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<"all" | "true" | "false">("all")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError("")
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      sort: "created_desc",
    })
    if (search.trim()) params.set("q", search.trim())
    if (status !== "all") params.set("isActive", status)
    authedFetch<{ items: BundleRow[]; total: number }>(`/api/admin/bundles?${params.toString()}`)
      .then((data) => {
        if (!cancelled) {
          setRows(Array.isArray(data?.items) ? data.items : [])
          setTotal(Number(data?.total ?? 0))
        }
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
  }, [search, status, page])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  const toggleActive = async (row: BundleRow) => {
    try {
      await authedPatch(`/api/admin/bundles/${row.id}`, { isActive: !row.isActive })
      setRows((prev) => prev.map((x) => (x.id === row.id ? { ...x, isActive: !x.isActive } : x)))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update status")
    }
  }

  const disableBundle = async (row: BundleRow) => {
    try {
      await authedDelete(`/api/admin/bundles/${row.id}`)
      setRows((prev) => prev.map((x) => (x.id === row.id ? { ...x, isActive: false } : x)))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to disable bundle")
    }
  }

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
      <div className="grid gap-3 rounded-2xl border border-[#E8DCC8] bg-white p-4 md:grid-cols-[1fr_180px]">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          placeholder="Search by name or slug"
          className="w-full rounded border px-3 py-2 text-sm"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as "all" | "true" | "false")
            setPage(1)
          }}
          className="w-full rounded border px-3 py-2 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {!loading ? (
        <div className="overflow-hidden rounded-2xl border border-[#E8DCC8] bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#FFFBF3] text-xs font-semibold uppercase tracking-wide text-[#7A7A7A]">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Savings</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-[#646464]" colSpan={7}>
                    No combos yet.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-[#FFFBF3]/60">
                    <td className="px-4 py-3 font-semibold text-[#4A1D1F]">{r.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[#646464]">{r.slug}</td>
                    <td className="px-4 py-3 text-xs text-[#646464]">{r.includedProductsCount}</td>
                    <td className="px-4 py-3 text-xs text-[#646464]">
                      Rs.{Number(r.effectivePrice ?? 0).toFixed(2)} ({r.pricingMode})
                    </td>
                    <td className="px-4 py-3 text-xs text-[#646464]">Rs.{Number(r.savings ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-xs text-[#646464]">{r.isActive === false ? "No" : "Yes"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link
                          href={`/admin/products/combos/${r.id}/edit`}
                          className="rounded border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide hover:bg-[#FFFBF3]"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => void toggleActive(r)}
                          className="rounded border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide hover:bg-[#FFFBF3]"
                        >
                          {r.isActive ? "Disable" : "Enable"}
                        </button>
                        {/* <button
                          type="button"
                          onClick={() => void disableBundle(r)}
                          className="rounded border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-red-700 hover:bg-red-50"
                        >
                          Delete
                        </button> */}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          className="rounded border px-3 py-1 text-xs disabled:opacity-40"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Prev
        </button>
        <span className="text-xs text-[#646464]">
          Page {page} / {totalPages}
        </span>
        <button
          type="button"
          className="rounded border px-3 py-1 text-xs disabled:opacity-40"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        >
          Next
        </button>
      </div>
    </section>
  )
}

