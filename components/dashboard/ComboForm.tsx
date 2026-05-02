"use client"

import { useEffect, useMemo, useState } from "react"
import { authedFetch, authedPost, authedPut } from "@/lib/dashboard-fetch"
import { uploadAdminImage } from "@/lib/admin-upload"
import { Loader2 } from "lucide-react"

type ProductLite = { id: string; name: string; slug: string; thumbnail?: string | null }

type ComboFormProps = {
  bundleId?: string
  onSaved?: (bundleId: string) => void
}

type BundlePayload = {
  name: string
  slug: string
  pricingMode: "fixed" | "dynamic"
  comboPrice?: number | null
  description?: string | null
  image?: string | null
  isActive: boolean
  productIds: string[]
}

export function ComboForm({ bundleId, onSaved }: ComboFormProps) {
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [pricingMode, setPricingMode] = useState<"fixed" | "dynamic">("fixed")
  const [comboPrice, setComboPrice] = useState("")
  const [description, setDescription] = useState("")
  const [image, setImage] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [products, setProducts] = useState<ProductLite[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [imageUploading, setImageUploading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      authedFetch<{ items?: any[] }>("/api/v1/products?page=1&limit=500"),
      bundleId ? authedFetch<any>(`/api/admin/bundles/${bundleId}`) : Promise.resolve(null),
    ])
      .then(([productsRes, bundleRes]) => {
        if (cancelled) return
        const rows = (productsRes as any)?.items ?? (productsRes as any)?.data?.items ?? []
        const lite = (Array.isArray(rows) ? rows : [])
          .filter((p) => p?.id && p?.name && p?.slug && p?.status === "published" && p?.isActive !== false)
          .map((p) => ({ id: String(p.id), name: String(p.name), slug: String(p.slug), thumbnail: p.thumbnail ? String(p.thumbnail) : null }))
        setProducts(lite)
        if (bundleRes) {
          setName(bundleRes.name ?? "")
          setSlug(bundleRes.slug ?? "")
          setPricingMode(bundleRes.pricingMode === "dynamic" ? "dynamic" : "fixed")
          setComboPrice(bundleRes.comboPrice != null ? String(bundleRes.comboPrice) : "")
          setDescription(bundleRes.description ?? "")
          setImage(bundleRes.image ?? "")
          setIsActive(bundleRes.isActive !== false)
          setSelectedProductIds(Array.isArray(bundleRes.products) ? bundleRes.products.map((x: any) => String(x.productId)) : [])
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load combo data")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [bundleId])

  useEffect(() => {
    if (!slug || slug.trim().length === 0 || slug === name) {
      const auto = name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9_-]/g, "")
      setSlug(auto)
    }
  }, [name])

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return products
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q))
  }, [products, search])

  const canSave = useMemo(() => {
    if (name.trim().length < 2) return false
    if (!slug || !/^[a-z0-9_-]+$/.test(slug)) return false
    if (selectedProductIds.length < 1 || selectedProductIds.length > 3) return false
    if (pricingMode === "fixed") {
      const n = Number(comboPrice)
      if (!Number.isFinite(n) || n <= 0) return false
    }
    return true
  }, [name, slug, selectedProductIds, pricingMode, comboPrice])

  const toggleProduct = (productId: string) => {
    setSelectedProductIds((prev) => {
      if (prev.includes(productId)) return prev.filter((id) => id !== productId)
      if (prev.length >= 3) return prev
      return [...prev, productId]
    })
  }

  const save = async () => {
    if (!canSave) return
    setSaving(true)
    setError("")
    const payload: BundlePayload = {
      name: name.trim(),
      slug: slug.trim(),
      pricingMode,
      comboPrice: pricingMode === "fixed" ? Number(comboPrice) : null,
      description: description.trim() || null,
      image: image.trim() || null,
      isActive,
      productIds: selectedProductIds,
    }
    try {
      const result = bundleId
        ? await authedPut<any>(`/api/admin/bundles/${bundleId}`, payload)
        : await authedPost<any>("/api/admin/bundles", payload)
      onSaved?.(String(result.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save combo")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-2xl border border-[#E8DCC8] bg-white p-5 md:p-6 space-y-4">
      {error ? <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}
      {loading ? <p className="text-sm text-[#646464]">Loading...</p> : null}
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#7A7A7A]">Combo name</span>
          <input className="mt-1 w-full rounded border px-3 py-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#7A7A7A]">Slug</span>
          <input className="mt-1 w-full rounded border px-3 py-2 text-sm" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))} />
        </label>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="block text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#7A7A7A]">Pricing mode</span>
          <select className="mt-1 w-full rounded border px-3 py-2 text-sm" value={pricingMode} onChange={(e) => setPricingMode(e.target.value as "fixed" | "dynamic")}>
            <option value="fixed">Fixed</option>
            <option value="dynamic">Dynamic</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#7A7A7A]">Combo price</span>
          <input className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-50" type="number" min={1} step="0.01" value={comboPrice} disabled={pricingMode !== "fixed"} onChange={(e) => setComboPrice(e.target.value)} />
        </label>
        <label className="flex items-center gap-2 pt-6 text-sm">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active
        </label>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#7A7A7A]">Combo image</span>
          <div className="mt-1 flex flex-wrap items-center gap-3 rounded border border-[#E8DCC8] bg-[#FFFBF3]/30 px-3 py-2">
            {image ? (
              <img src={image} alt="" className="h-16 w-16 rounded object-cover border border-[#E8DCC8]" />
            ) : null}
            <span className="relative inline-flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                disabled={imageUploading}
                className="max-w-[200px] cursor-pointer text-xs file:cursor-pointer"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  e.target.value = ""
                  if (!f || !f.type.startsWith("image/")) return
                  setImageUploading(true)
                  void uploadAdminImage(f, "bundles/cover")
                    .then((url) => {
                      if (url) setImage(url)
                    })
                    .catch(() => setError("Image upload failed"))
                    .finally(() => setImageUploading(false))
                }}
              />
              {imageUploading ? <Loader2 className="h-4 w-4 animate-spin text-[#7B3010]" /> : null}
            </span>
            {image ? (
              <button type="button" className="text-xs font-semibold uppercase text-red-700 hover:underline" onClick={() => setImage("")}>
                Clear
              </button>
            ) : null}
          </div>
          <span className="mt-1 block text-[10px] text-[#9A9A92]">Upload only — stored on server.</span>
        </label>
        <label className="block text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#7A7A7A]">Description</span>
          <input className="mt-1 w-full rounded border px-3 py-2 text-sm" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
        </label>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#7A7A7A]">
          Products (max 3)
        </p>
        <input className="w-full rounded border px-3 py-2 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." />
        <div className="grid max-h-72 gap-2 overflow-auto rounded border p-2 md:grid-cols-2">
          {filteredProducts.map((p) => {
            const checked = selectedProductIds.includes(p.id)
            const blocked = !checked && selectedProductIds.length >= 3
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggleProduct(p.id)}
                disabled={blocked}
                className={`rounded border px-3 py-2 text-left text-sm ${checked ? "border-[#7B3010] bg-[#FFFBF3]" : "border-[#E8DCC8]"} disabled:opacity-50`}
              >
                <p className="font-semibold text-[#4A1D1F]">{p.name}</p>
                <p className="text-xs text-[#646464]">{p.slug}</p>
              </button>
            )
          })}
        </div>
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void save()}
          disabled={!canSave || saving}
          className="rounded-full bg-[#7B3010] px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white disabled:opacity-50"
        >
          {saving ? "Saving..." : bundleId ? "Update combo" : "Create combo"}
        </button>
      </div>
    </div>
  )
}
