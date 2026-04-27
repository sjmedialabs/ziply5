"use client"

import { useCallback, useEffect, useState } from "react"
import { authedDelete, authedFetch, authedPatch, authedPost, authedPut } from "@/lib/dashboard-fetch"

type OfferType = "coupon" | "automatic" | "product_discount" | "cart_discount" | "shipping_discount" | "bogo"
type OfferStatus = "draft" | "active" | "inactive" | "expired"

type Offer = {
  id: string
  type: OfferType
  name: string
  code: string | null
  description: string | null
  status: OfferStatus
  priority: number
  stackable: boolean
  starts_at: string | null
  ends_at: string | null
  config: Record<string, unknown>
  usageCount?: number
  totalSavings?: number
}

const statusCycle: OfferStatus[] = ["draft", "active", "inactive"]

export default function OffersModulePage({ type, title, subtitle }: { type: OfferType; title: string; subtitle: string }) {
  const [rows, setRows] = useState<Offer[]>([])
  const [total, setTotal] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | OfferStatus>("all")
  const [sortBy, setSortBy] = useState<"priority" | "created_at" | "name">("priority")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectedLogOfferId, setSelectedLogOfferId] = useState<string>("")
  const [logs, setLogs] = useState<Array<{ id: string; user_id: string | null; order_id: string | null; savings: number; status: string; used_at: string }>>([])
  const [draft, setDraft] = useState({
    id: "",
    name: "",
    code: "",
    description: "",
    priority: 100,
    stackable: false,
    status: "draft" as OfferStatus,
    startsAt: "",
    endsAt: "",
    discountType: "percentage",
    discountValue: "0",
    maxDiscountCap: "",
    minCartValue: "",
    usageLimitTotal: "",
    usageLimitPerUser: "",
    firstOrderOnly: false,
    applicableProductIds: "",
    applicableCategoryIds: "",
    excludedProductIds: "",
    allowedSegments: "",
    actionType: "discount",
    freeShipping: false,
    freeGiftSku: "",
    buyQty: "2",
    getQty: "1",
    repeatable: true,
    maxFreeUnits: "",
    shippingMode: "flat",
    shippingDiscountValue: "0",
    locationCodes: "",
    targetProductIds: "",
    targetCategoryIds: "",
    productOverrideMode: "manual_wins",
  })

  const load = useCallback(async () => {
    setBusy(true)
    setError("")
    try {
      const data = await authedFetch<{ items: Offer[]; total: number; page: number; pageSize: number }>(
        `/api/v1/offers?type=${encodeURIComponent(type)}&status=${statusFilter === "all" ? "" : statusFilter}&q=${encodeURIComponent(query)}&sortBy=${sortBy}&sortDir=${sortDir}&page=${page}&pageSize=${pageSize}`,
      )
      setRows(data.items ?? [])
      setTotal(data.total ?? 0)
      setSelectedIds([])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load offers")
    } finally {
      setBusy(false)
    }
  }, [page, pageSize, query, sortBy, sortDir, statusFilter, type])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!selectedLogOfferId) return
    void authedFetch<Array<{ id: string; user_id: string | null; order_id: string | null; savings: number; status: string; used_at: string }>>(
      `/api/v1/offers?logsForOfferId=${selectedLogOfferId}&page=1&pageSize=20`,
    )
      .then(setLogs)
      .catch(() => setLogs([]))
  }, [selectedLogOfferId])

  const resetDraft = () =>
    setDraft({
      id: "",
      name: "",
      code: "",
      description: "",
      priority: 100,
      stackable: false,
      status: "draft",
      startsAt: "",
      endsAt: "",
      discountType: "percentage",
      discountValue: "0",
      maxDiscountCap: "",
      minCartValue: "",
      usageLimitTotal: "",
      usageLimitPerUser: "",
      firstOrderOnly: false,
      applicableProductIds: "",
      applicableCategoryIds: "",
      excludedProductIds: "",
      allowedSegments: "",
      actionType: "discount",
      freeShipping: false,
      freeGiftSku: "",
      buyQty: "2",
      getQty: "1",
      repeatable: true,
      maxFreeUnits: "",
      shippingMode: "flat",
      shippingDiscountValue: "0",
      locationCodes: "",
      targetProductIds: "",
      targetCategoryIds: "",
      productOverrideMode: "manual_wins",
    })

  const buildConfig = () => {
    const common = {
      discountType: draft.discountType,
      discountValue: Number(draft.discountValue || 0),
      maxDiscountCap: draft.maxDiscountCap ? Number(draft.maxDiscountCap) : null,
      minCartValue: draft.minCartValue ? Number(draft.minCartValue) : 0,
    }
    if (type === "coupon") {
      return {
        ...common,
        usageLimitTotal: draft.usageLimitTotal ? Number(draft.usageLimitTotal) : null,
        usageLimitPerUser: draft.usageLimitPerUser ? Number(draft.usageLimitPerUser) : null,
        firstOrderOnly: draft.firstOrderOnly,
        applicableProductIds: draft.applicableProductIds.split(",").map((v) => v.trim()).filter(Boolean),
        applicableCategoryIds: draft.applicableCategoryIds.split(",").map((v) => v.trim()).filter(Boolean),
        excludedProductIds: draft.excludedProductIds.split(",").map((v) => v.trim()).filter(Boolean),
        allowedSegments: draft.allowedSegments.split(",").map((v) => v.trim()).filter(Boolean),
      }
    }
    if (type === "automatic") return { ...common, actionType: draft.actionType, freeShipping: draft.freeShipping, freeGiftSku: draft.freeGiftSku || null }
    if (type === "product_discount") {
      return {
        ...common,
        targetProductIds: draft.targetProductIds.split(",").map((v) => v.trim()).filter(Boolean),
        targetCategoryIds: draft.targetCategoryIds.split(",").map((v) => v.trim()).filter(Boolean),
        productOverrideMode: draft.productOverrideMode,
      }
    }
    if (type === "cart_discount") return common
    if (type === "shipping_discount") {
      return {
        minCartValue: draft.minCartValue ? Number(draft.minCartValue) : 0,
        mode: draft.shippingMode,
        discountValue: Number(draft.shippingDiscountValue || 0),
        locationCodes: draft.locationCodes.split(",").map((v) => v.trim()).filter(Boolean),
      }
    }
    return {
      buyQty: Number(draft.buyQty || 2),
      getQty: Number(draft.getQty || 1),
      repeatable: draft.repeatable,
      maxFreeUnits: draft.maxFreeUnits ? Number(draft.maxFreeUnits) : null,
    }
  }

  const upsert = async () => {
    setBusy(true)
    setError("")
    try {
      const payload = {
        type,
        name: draft.name.trim(),
        code: draft.code.trim() || null,
        description: draft.description.trim() || null,
        priority: Number(draft.priority),
        stackable: draft.stackable,
        status: draft.status,
        startsAt: draft.startsAt || null,
        endsAt: draft.endsAt || null,
        config: buildConfig(),
      }
      if (!payload.name) throw new Error("Offer name is required")
      if (type === "coupon" && !payload.code) throw new Error("Coupon code is required")
      if (draft.id) {
        await authedPut<{ id: string }>("/api/v1/offers", { id: draft.id, ...payload })
      } else {
        await authedPost<{ id: string }>("/api/v1/offers", payload)
      }
      resetDraft()
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save offer")
    } finally {
      setBusy(false)
    }
  }

  const renderTypeSpecificFields = () => {
    if (type === "coupon") {
      return (
        <>
          <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Usage limit total" value={draft.usageLimitTotal} onChange={(e) => setDraft((p) => ({ ...p, usageLimitTotal: e.target.value }))} />
          <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Usage per user" value={draft.usageLimitPerUser} onChange={(e) => setDraft((p) => ({ ...p, usageLimitPerUser: e.target.value }))} />
          <label className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm"><input type="checkbox" checked={draft.firstOrderOnly} onChange={(e) => setDraft((p) => ({ ...p, firstOrderOnly: e.target.checked }))} />First order only</label>
          <input className="rounded-xl border px-3 py-2 text-sm md:col-span-2" placeholder="Applicable product IDs (comma)" value={draft.applicableProductIds} onChange={(e) => setDraft((p) => ({ ...p, applicableProductIds: e.target.value }))} />
          <input className="rounded-xl border px-3 py-2 text-sm md:col-span-2" placeholder="Applicable category IDs (comma)" value={draft.applicableCategoryIds} onChange={(e) => setDraft((p) => ({ ...p, applicableCategoryIds: e.target.value }))} />
          <input className="rounded-xl border px-3 py-2 text-sm md:col-span-2" placeholder="Excluded product IDs (comma)" value={draft.excludedProductIds} onChange={(e) => setDraft((p) => ({ ...p, excludedProductIds: e.target.value }))} />
          <input className="rounded-xl border px-3 py-2 text-sm md:col-span-2" placeholder="Allowed user segments (comma)" value={draft.allowedSegments} onChange={(e) => setDraft((p) => ({ ...p, allowedSegments: e.target.value }))} />
        </>
      )
    }
    if (type === "automatic") {
      return (
        <>
          <select className="rounded-xl border px-3 py-2 text-sm" value={draft.actionType} onChange={(e) => setDraft((p) => ({ ...p, actionType: e.target.value }))}>
            <option value="discount">% / Flat Discount</option>
            <option value="free_gift">Free Gift</option>
            <option value="free_shipping">Free Shipping</option>
          </select>
          <label className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm"><input type="checkbox" checked={draft.freeShipping} onChange={(e) => setDraft((p) => ({ ...p, freeShipping: e.target.checked }))} />Free shipping</label>
          <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Free gift SKU (optional)" value={draft.freeGiftSku} onChange={(e) => setDraft((p) => ({ ...p, freeGiftSku: e.target.value }))} />
        </>
      )
    }
    if (type === "product_discount") {
      return (
        <>
          <input className="rounded-xl border px-3 py-2 text-sm md:col-span-2" placeholder="Target product IDs (comma)" value={draft.targetProductIds} onChange={(e) => setDraft((p) => ({ ...p, targetProductIds: e.target.value }))} />
          <input className="rounded-xl border px-3 py-2 text-sm md:col-span-2" placeholder="Target category IDs (comma)" value={draft.targetCategoryIds} onChange={(e) => setDraft((p) => ({ ...p, targetCategoryIds: e.target.value }))} />
          <select className="rounded-xl border px-3 py-2 text-sm" value={draft.productOverrideMode} onChange={(e) => setDraft((p) => ({ ...p, productOverrideMode: e.target.value }))}>
            <option value="manual_wins">Manual Product Discount Wins</option>
            <option value="offer_wins">Offer Priority Wins</option>
          </select>
        </>
      )
    }
    if (type === "shipping_discount") {
      return (
        <>
          <select className="rounded-xl border px-3 py-2 text-sm" value={draft.shippingMode} onChange={(e) => setDraft((p) => ({ ...p, shippingMode: e.target.value }))}>
            <option value="flat">Flat Off</option>
            <option value="percentage">% Off</option>
            <option value="free">Free Shipping</option>
          </select>
          <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Shipping discount value" value={draft.shippingDiscountValue} onChange={(e) => setDraft((p) => ({ ...p, shippingDiscountValue: e.target.value }))} />
          <input className="rounded-xl border px-3 py-2 text-sm md:col-span-2" placeholder="Location codes (city/state/pincode comma)" value={draft.locationCodes} onChange={(e) => setDraft((p) => ({ ...p, locationCodes: e.target.value }))} />
        </>
      )
    }
    if (type === "bogo") {
      return (
        <>
          <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Buy qty" value={draft.buyQty} onChange={(e) => setDraft((p) => ({ ...p, buyQty: e.target.value }))} />
          <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Get qty" value={draft.getQty} onChange={(e) => setDraft((p) => ({ ...p, getQty: e.target.value }))} />
          <label className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm"><input type="checkbox" checked={draft.repeatable} onChange={(e) => setDraft((p) => ({ ...p, repeatable: e.target.checked }))} />Repeatable</label>
          <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Max free units" value={draft.maxFreeUnits} onChange={(e) => setDraft((p) => ({ ...p, maxFreeUnits: e.target.value }))} />
        </>
      )
    }
    return null
  }

  return (
    <section className="mx-auto max-w-7xl space-y-4">
      <div>
        <h1 className="font-melon text-2xl font-bold text-[#4A1D1F]">{title}</h1>
        <p className="text-sm text-[#646464]">{subtitle}</p>
      </div>

      <div className="grid gap-3 rounded-2xl border border-[#E8DCC8] bg-white p-4 shadow-sm md:grid-cols-4">
        <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Offer name" value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} />
        <input className="rounded-xl border px-3 py-2 text-sm" placeholder={type === "coupon" ? "Coupon code (required)" : "Coupon code (optional)"} value={draft.code} onChange={(e) => setDraft((p) => ({ ...p, code: e.target.value.toUpperCase() }))} />
        <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Description" value={draft.description} onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))} />
        <input type="number" className="rounded-xl border px-3 py-2 text-sm" placeholder="Priority" value={draft.priority} onChange={(e) => setDraft((p) => ({ ...p, priority: Number(e.target.value) }))} />
        <select className="rounded-xl border px-3 py-2 text-sm" value={draft.discountType} onChange={(e) => setDraft((p) => ({ ...p, discountType: e.target.value }))}>
          <option value="percentage">Percentage</option>
          <option value="flat">Flat</option>
        </select>
        <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Discount value" value={draft.discountValue} onChange={(e) => setDraft((p) => ({ ...p, discountValue: e.target.value }))} />
        <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Max discount cap (optional)" value={draft.maxDiscountCap} onChange={(e) => setDraft((p) => ({ ...p, maxDiscountCap: e.target.value }))} />
        <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Min cart value (optional)" value={draft.minCartValue} onChange={(e) => setDraft((p) => ({ ...p, minCartValue: e.target.value }))} />
        <input type="datetime-local" className="rounded-xl border px-3 py-2 text-sm" value={draft.startsAt} onChange={(e) => setDraft((p) => ({ ...p, startsAt: e.target.value }))} />
        <input type="datetime-local" className="rounded-xl border px-3 py-2 text-sm" value={draft.endsAt} onChange={(e) => setDraft((p) => ({ ...p, endsAt: e.target.value }))} />
        <select className="rounded-xl border px-3 py-2 text-sm" value={draft.status} onChange={(e) => setDraft((p) => ({ ...p, status: e.target.value as OfferStatus }))}>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="expired">Expired</option>
        </select>
        <label className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm">
          <input type="checkbox" checked={draft.stackable} onChange={(e) => setDraft((p) => ({ ...p, stackable: e.target.checked }))} />
          Stackable
        </label>
        {renderTypeSpecificFields()}
        <div className="md:col-span-4 flex gap-2">
          <button type="button" onClick={() => void upsert()} disabled={busy} className="rounded-full bg-[#7B3010] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white disabled:opacity-50">
            {draft.id ? "Update Offer" : "Create Offer"}
          </button>
          {draft.id ? (
            <button type="button" onClick={resetDraft} className="rounded-full border border-[#7B3010] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#7B3010]">
              Cancel Edit
            </button>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-[#E8DCC8] bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <input className="w-full max-w-sm rounded-full border px-4 py-2 text-sm" placeholder="Search by offer/coupon code" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1) }} />
          <select className="rounded-full border px-3 py-2 text-xs" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as any); setPage(1) }}>
            <option value="all">All statuses</option><option value="draft">Draft</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="expired">Expired</option>
          </select>
          <select className="rounded-full border px-3 py-2 text-xs" value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
            <option value="priority">Sort: Priority</option><option value="created_at">Sort: Created</option><option value="name">Sort: Name</option>
          </select>
          <select className="rounded-full border px-3 py-2 text-xs" value={sortDir} onChange={(e) => setSortDir(e.target.value as any)}>
            <option value="asc">Asc</option><option value="desc">Desc</option>
          </select>
          <button type="button" className="rounded-full border border-[#7B3010] px-3 py-1.5 text-xs font-semibold uppercase text-[#7B3010]" onClick={() => void load()} disabled={busy}>
            Refresh
          </button>
        </div>
        {!!selectedIds.length && (
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xs text-[#7A7A7A]">{selectedIds.length} selected</span>
            <button type="button" className="rounded-full border px-3 py-1 text-[10px]" onClick={() => void authedPatch("/api/v1/offers", { action: "bulk_toggle", ids: selectedIds, status: "active" }).then(() => load())}>Bulk Enable</button>
            <button type="button" className="rounded-full border px-3 py-1 text-[10px]" onClick={() => void authedPatch("/api/v1/offers", { action: "bulk_toggle", ids: selectedIds, status: "inactive" }).then(() => load())}>Bulk Disable</button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-[#7A7A7A]">
                <th className="px-2 py-2"><input type="checkbox" checked={rows.length > 0 && selectedIds.length === rows.length} onChange={(e) => setSelectedIds(e.target.checked ? rows.map((r) => r.id) : [])} /></th>
                <th className="px-2 py-2">Name</th>
                <th className="px-2 py-2">Code</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Priority</th>
                <th className="px-2 py-2">Usage</th>
                <th className="px-2 py-2">Schedule</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b align-top">
                  <td className="px-2 py-2"><input type="checkbox" checked={selectedIds.includes(row.id)} onChange={(e) => setSelectedIds((prev) => e.target.checked ? [...new Set([...prev, row.id])] : prev.filter((id) => id !== row.id))} /></td>
                  <td className="px-2 py-2">
                    <div className="font-semibold text-[#2A1810]">{row.name}</div>
                    <div className="text-xs text-[#7A7A7A]">{row.description || "-"}</div>
                  </td>
                  <td className="px-2 py-2 text-xs">{row.code || "-"}</td>
                  <td className="px-2 py-2 text-xs uppercase">{row.status}</td>
                  <td className="px-2 py-2">{row.priority}</td>
                  <td className="px-2 py-2 text-xs text-[#7A7A7A]">
                    {row.usageCount ?? 0} uses / Rs.{Number(row.totalSavings ?? 0).toFixed(0)}
                  </td>
                  <td className="px-2 py-2 text-xs text-[#7A7A7A]">{row.starts_at ? new Date(row.starts_at).toLocaleDateString() : "Any"} - {row.ends_at ? new Date(row.ends_at).toLocaleDateString() : "No end"}</td>
                  <td className="px-2 py-2">
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        className="rounded-full border px-2 py-1 text-[10px]"
                        onClick={() => {
                          const cfg = (row.config ?? {}) as Record<string, unknown>
                          setDraft({
                            id: row.id,
                            name: row.name,
                            code: row.code ?? "",
                            description: row.description ?? "",
                            priority: row.priority,
                            stackable: row.stackable,
                            status: row.status,
                            startsAt: row.starts_at ? row.starts_at.slice(0, 16) : "",
                            endsAt: row.ends_at ? row.ends_at.slice(0, 16) : "",
                            discountType: String(cfg.discountType ?? "percentage"),
                            discountValue: String(cfg.discountValue ?? "0"),
                            maxDiscountCap: cfg.maxDiscountCap == null ? "" : String(cfg.maxDiscountCap),
                            minCartValue: cfg.minCartValue == null ? "" : String(cfg.minCartValue),
                            usageLimitTotal: cfg.usageLimitTotal == null ? "" : String(cfg.usageLimitTotal),
                            usageLimitPerUser: cfg.usageLimitPerUser == null ? "" : String(cfg.usageLimitPerUser),
                            firstOrderOnly: Boolean(cfg.firstOrderOnly ?? false),
                            applicableProductIds: ((cfg.applicableProductIds as string[]) ?? []).join(","),
                            applicableCategoryIds: ((cfg.applicableCategoryIds as string[]) ?? []).join(","),
                            excludedProductIds: ((cfg.excludedProductIds as string[]) ?? []).join(","),
                            allowedSegments: ((cfg.allowedSegments as string[]) ?? []).join(","),
                            actionType: String(cfg.actionType ?? "discount"),
                            freeShipping: Boolean(cfg.freeShipping ?? false),
                            freeGiftSku: String(cfg.freeGiftSku ?? ""),
                            buyQty: String(cfg.buyQty ?? "2"),
                            getQty: String(cfg.getQty ?? "1"),
                            repeatable: Boolean(cfg.repeatable ?? true),
                            maxFreeUnits: cfg.maxFreeUnits == null ? "" : String(cfg.maxFreeUnits),
                            shippingMode: String(cfg.mode ?? "flat"),
                            shippingDiscountValue: String(cfg.discountValue ?? "0"),
                            locationCodes: ((cfg.locationCodes as string[]) ?? []).join(","),
                            targetProductIds: ((cfg.targetProductIds as string[]) ?? []).join(","),
                            targetCategoryIds: ((cfg.targetCategoryIds as string[]) ?? []).join(","),
                            productOverrideMode: String(cfg.productOverrideMode ?? "manual_wins"),
                          })
                        }}
                      >
                        Edit
                      </button>
                      <button type="button" className="rounded-full border px-2 py-1 text-[10px]" onClick={() => void authedPatch("/api/v1/offers", { id: row.id, action: "duplicate" }).then(() => load())}>Duplicate</button>
                      <button
                        type="button"
                        className="rounded-full border px-2 py-1 text-[10px]"
                        onClick={() => {
                          const idx = statusCycle.indexOf(row.status === "expired" ? "inactive" : row.status)
                          const next = statusCycle[(idx + 1) % statusCycle.length]
                          void authedPatch("/api/v1/offers", { id: row.id, action: "toggle", status: next }).then(() => load())
                        }}
                      >
                        Toggle
                      </button>
                      <button type="button" className="rounded-full border px-2 py-1 text-[10px]" onClick={() => setSelectedLogOfferId(row.id)}>Logs</button>
                      <button type="button" className="rounded-full border border-red-300 px-2 py-1 text-[10px] text-red-700" onClick={() => void authedDelete(`/api/v1/offers?id=${row.id}`).then(() => load())}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-sm text-[#7A7A7A]">
                    {busy ? "Loading offers..." : "No offers found"}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-[#7A7A7A]">
          <span>Total {total}</span>
          <div className="flex items-center gap-2">
            <select className="rounded-full border px-2 py-1" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}>
              <option value={10}>10</option><option value={20}>20</option><option value={50}>50</option>
            </select>
            <button type="button" className="rounded-full border px-2 py-1 disabled:opacity-40" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
            <span>Page {page}</span>
            <button type="button" className="rounded-full border px-2 py-1 disabled:opacity-40" disabled={page * pageSize >= total} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </div>
        {error ? <p className="mt-3 text-xs text-red-600">{error}</p> : null}
      </div>
      {selectedLogOfferId ? (
        <div className="rounded-2xl border border-[#E8DCC8] bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#2A1810]">Offer Logs</h2>
            <button type="button" className="rounded-full border px-3 py-1 text-[10px]" onClick={() => setSelectedLogOfferId("")}>Close</button>
          </div>
          <div className="space-y-1 text-xs text-[#646464]">
            {logs.map((log) => (
              <div key={log.id} className="rounded border p-2">
                <span>{new Date(log.used_at).toLocaleString()}</span> - <span>{log.status}</span> - <span>Rs.{Number(log.savings).toFixed(2)}</span> - <span>User: {log.user_id ?? "guest"}</span> - <span>Order: {log.order_id ?? "-"}</span>
              </div>
            ))}
            {!logs.length ? <p>No usage logs yet.</p> : null}
          </div>
        </div>
      ) : null}
    </section>
  )
}

