"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { authedFetch, authedPatch, authedPost } from "@/lib/dashboard-fetch"
import { ConsoleTable, ConsoleTd } from "@/components/dashboard/ConsoleTable"
import { RichTextEditor } from "@/components/dashboard/RichTextEditor"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

type Mode = "list" | "add" | "edit" | "view"

type ProductRow = {
  id: string
  name: string
  slug: string
  sku: string
  status: string
  price: string | number
}

type ProductDetail = {
  id: string
  name: string
  slug: string
  sku: string
  price: string | number
  status: "draft" | "published" | "archived"
  description?: string | null
  type?: "simple" | "variant"
  basePrice?: string | number | null
  salePrice?: string | number | null
  discountPercent?: string | number | null
  stockStatus?: "in_stock" | "out_of_stock"
  totalStock?: number
  shelfLife?: string | null
  taxIncluded?: boolean
  isActive?: boolean
  isFeatured?: boolean
  isBestSeller?: boolean
  thumbnail?: string | null
  videoUrl?: string | null
  metaTitle?: string | null
  metaDescription?: string | null
  categories?: Array<{ categoryId: string }>
  tags?: Array<{ tag: { name: string } }>
  variants?: Array<{
    name: string
    weight?: string | null
    sku: string
    price: string | number
    mrp?: string | number | null
    stock: number
  }>
  images?: Array<{ url: string }>
  details?: Array<{ title: string; content: string; sortOrder?: number }>
  sections?: Array<{ id: string; title: string; description: string; sortOrder: number; isActive: boolean }>
}

const ViewField = ({ label, value, className = "" }: { label: string; value: React.ReactNode; className?: string }) => (
  <div className={`flex flex-col gap-1 rounded-lg border border-[#D9D9D1] bg-[#FDFDFD] px-3 py-2 text-sm ${className}`}>
    <span className="text-[10px] font-bold uppercase text-[#646464]">{label}</span>
    <div className="font-medium text-[#2A1810] break-words">
      {value || <span className="text-gray-400 italic">No data</span>}
    </div>
  </div>
)

type CategoryRow = { id: string; name: string }
const statuses = ["draft", "published", "archived"] as const
const foodTypes = ["veg", "non-veg"] as const
const MAX_SECTIONS = 10
const uniq = (list: string[]) => [...new Set(list.map((x) => x.trim()).filter(Boolean))]
const toNumOrNull = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

export function ProductConsolePage({
  adminView,
  mode,
  productId,
}: {
  adminView: boolean
  mode: Mode
  productId?: string
}) {
  const router = useRouter()
  const [rows, setRows] = useState<ProductRow[]>([])
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [rowStatus, setRowStatus] = useState<Record<string, string>>({})

  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [sku, setSku] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState<(typeof statuses)[number]>("published")
  const [type, setType] = useState<"simple" | "variant">("variant")
  const [price, setPrice] = useState("")
  const [basePrice, setBasePrice] = useState("")
  const [salePrice, setSalePrice] = useState("")
  const [discountPercent, setDiscountPercent] = useState("")
  const [stockStatus, setStockStatus] = useState<"in_stock" | "out_of_stock">("in_stock")
  const [totalStock, setTotalStock] = useState("0")
  const [shelfLife, setShelfLife] = useState("")
  const [taxIncluded, setTaxIncluded] = useState(true)
  const [isActive, setIsActive] = useState(true)
  const [isFeatured, setIsFeatured] = useState(false)
  const [isBestSeller, setIsBestSeller] = useState(false)
  const [thumbnailUrls, setThumbnailUrls] = useState<string[]>([])
  const [metaTitle, setMetaTitle] = useState("")
  const [metaDescription, setMetaDescription] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [foodType, setFoodType] = useState<"" | "veg" | "non-veg">("")
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [tagsCsv, setTagsCsv] = useState("")
  const [sections, setSections] = useState<Array<{ id?: string; title: string; description: string; sortOrder: number; isActive: boolean }>>([
    { title: "Key Features", description: "<ul><li></li></ul>", sortOrder: 0, isActive: true },
  ])

  const basePath = adminView ? "/admin/products" : "/admin/products"

  const loadList = useCallback(() => {
    setLoading(true)
    setError("")
    Promise.all([
      authedFetch<{ items: ProductRow[]; total: number }>("/api/v1/products?page=1&limit=100"),
      authedFetch<CategoryRow[]>("/api/v1/categories").catch(() => []),
    ])
      .then(([products, cats]) => {
        setRows(products.items)
        setTotal(products.total)
        setCategories(cats.filter((c) => Boolean(c.id)))
        const map: Record<string, string> = {}
        products.items.forEach((p) => {
          map[p.id] = p.status
        })
        setRowStatus(map)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const loadEdit = useCallback(async () => {
    if (!productId) return
    setLoading(true)
    setError("")
    try {
      const [p, cats] = await Promise.all([
        authedFetch<ProductDetail>(`/api/v1/products/${productId}`),
        authedFetch<CategoryRow[]>("/api/v1/categories").catch(() => []),
      ])
      const v = p.variants?.[0]
      setCategories(cats.filter((c) => Boolean(c.id)))
      setName(p.name)
      setSlug(p.slug)
      setSku(p.sku)
      setDescription(p.description ?? "")
      setStatus(p.status)
      setType(p.type ?? "variant")
      setPrice(String(Number(v?.price ?? p.price ?? 0)))
      setBasePrice(p.basePrice != null ? String(Number(p.basePrice)) : "")
      setSalePrice(p.salePrice != null ? String(Number(p.salePrice)) : "")
      setDiscountPercent(p.discountPercent != null ? String(Number(p.discountPercent)) : "")
      setStockStatus(p.stockStatus ?? "in_stock")
      setTotalStock(String(p.totalStock ?? 0))
      setShelfLife(p.shelfLife ?? "")
      setTaxIncluded(p.taxIncluded ?? true)
      setIsActive(p.isActive ?? true)
      setIsFeatured(p.isFeatured ?? false)
      setIsBestSeller(p.isBestSeller ?? false)
      setThumbnailUrls(uniq([p.thumbnail ?? ""]))
      setMetaTitle(p.metaTitle ?? "")
      setMetaDescription(p.metaDescription ?? "")
      setCategoryId(p.categories?.[0]?.categoryId ?? "")
      const tagNames = (p.tags ?? []).map((x) => x.tag.name.toLowerCase())
      setFoodType(tagNames.includes("veg") || tagNames.includes("vegetarian") ? "veg" : tagNames.includes("non-veg") || tagNames.includes("non vegetarian") ? "non-veg" : "")
      setImageUrls(uniq((p.images ?? []).map((img) => img.url)))
      setTagsCsv(tagNames.filter((x) => x !== "veg" && x !== "vegetarian" && x !== "non-veg" && x !== "non vegetarian").join(", "))
      const nextSections =
        (p.sections?.length
          ? p.sections.map((s) => ({
              id: s.id,
              title: s.title,
              description: s.description,
              sortOrder: s.sortOrder ?? 0,
              isActive: s.isActive ?? true,
            }))
          : (p.details ?? []).map((d, idx) => ({
              title: d.title,
              description: d.content,
              sortOrder: d.sortOrder ?? idx,
              isActive: true,
            }))) ?? []
      setSections(
        nextSections.length
          ? nextSections.sort((a, b) => a.sortOrder - b.sortOrder)
          : [{ title: "Key Features", description: "<ul><li></li></ul>", sortOrder: 0, isActive: true }],
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load product")
    } finally {
      setLoading(false)
    }
  }, [productId])

  useEffect(() => {
    if (mode === "list" || mode === "add") loadList()
    if (mode === "edit" || mode === "view") void loadEdit()
  }, [loadEdit, loadList, mode])

  const payload = useMemo(() => {
    const parsedPrice =
      toNumOrNull(price) ??
      toNumOrNull(salePrice) ??
      toNumOrNull(basePrice)
    return {
      name: name.trim(),
      slug: slug.trim(),
      sku: sku.trim(),
      description: description.trim() || undefined,
      status,
      type,
      price: parsedPrice,
      basePrice: toNumOrNull(basePrice),
      salePrice: toNumOrNull(salePrice),
      discountPercent: toNumOrNull(discountPercent),
      stockStatus,
      totalStock: totalStock.trim() ? Number(totalStock) : 0,
      shelfLife: shelfLife.trim() || null,
      taxIncluded,
      isActive,
      isFeatured,
      isBestSeller,
      thumbnail: uniq(thumbnailUrls)[0] ?? null,
      metaTitle: metaTitle.trim() || null,
      metaDescription: metaDescription.trim() || null,
      categoryId: categoryId || undefined,
      images: uniq([...thumbnailUrls, ...imageUrls]),
      tags: [
        foodType,
        ...tagsCsv
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean),
      ],
      sections: sections
        .map((s, idx) => ({
          id: s.id,
          title: s.title.trim(),
          description: s.description.trim(),
          sortOrder: Number.isFinite(s.sortOrder) ? s.sortOrder : idx,
          isActive: s.isActive,
        }))
        .filter((s) => s.title && s.description)
        .slice(0, MAX_SECTIONS),
    }
  }, [
    basePrice,
    categoryId,
    description,
    discountPercent,
    imageUrls,
    isActive,
    isBestSeller,
    isFeatured,
    metaDescription,
    metaTitle,
    name,
    price,
    salePrice,
    shelfLife,
    sku,
    slug,
    status,
    stockStatus,
    foodType,
    tagsCsv,
    taxIncluded,
    thumbnailUrls,
    totalStock,
    type,
    sections,
  ])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!payload.name || !payload.slug || !payload.sku) {
      setError("Name, slug and SKU are required")
      return
    }
    if (!payload.price || payload.price <= 0) {
      setError("Provide at least one valid price (Sale/Base/Price)")
      return
    }
    if (!foodType) {
      setError("Veg / Non-veg selection is required")
      return
    }
    if (payload.sections.length === 0) {
      setError("At least one product section is required")
      return
    }
    setSaving(true)
    setError("")
    try {
      if (mode === "edit" && productId) {
        await authedPatch(`/api/v1/products/${productId}`, payload)
      } else {
        await authedPost("/api/v1/products", payload)
      }
      router.push(basePath)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const uploadMany = async (
    files: FileList | null | undefined,
    kind: "thumbnail" | "image",
  ) => {
    const selected = files ? Array.from(files) : []
    if (selected.length === 0) return
    setUploading(true)
    setError("")
    try {
      const token = window.localStorage.getItem("ziply5_access_token")
      const form = new FormData()
      selected.forEach((file) => form.append("files", file))
      form.append("folder", `products/${kind}`)
      const res = await fetch("/api/v1/uploads", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: form,
      })
      const json = (await res.json()) as {
        success?: boolean
        message?: string
        data?: { files?: Array<{ url: string }> }
      }
      if (!res.ok || json.success === false) {
        setError(json.message ?? "Upload failed")
        return
      }
      const urls = uniq((json.data?.files ?? []).map((f) => f.url))
      if (urls.length === 0) {
        setError("Upload failed")
        return
      }
      if (kind === "thumbnail") {
        setThumbnailUrls((prev) => uniq([...prev, ...urls]))
      }
      if (kind === "image") {
        setImageUrls((prev) => uniq([...prev, ...urls]))
      }
    } catch {
      setError("Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const saveRowStatus = async (id: string) => {
    const next = rowStatus[id]
    if (!next) return
    setSaving(true)
    setError("")
    try {
      await authedPatch(`/api/v1/products/${id}`, { status: next })
      await loadList()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Status update failed")
    } finally {
      setSaving(false)
    }
  }

  if (mode === "list") {
    return (
      <section className="mx-auto max-w-7xl space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-melon text-2xl font-bold text-[#4A1D1F]">Products</h1>
            <p className="text-sm text-[#646464]">{total} items. Published products appear on website.</p>
          </div>
          <div className="flex gap-2">
            <Link href={`${basePath}/add`} className="rounded-full bg-[#7B3010] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white">
              Add product
            </Link>
            <button type="button" onClick={() => loadList()} className="rounded-full border border-[#E8DCC8] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#4A1D1F] hover:bg-[#FFFBF3]">
              Refresh
            </button>
          </div>
        </div>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
        {loading && <p className="text-sm text-[#646464]">Loading...</p>}
        {!loading && (
<<<<<<< HEAD
          <ConsoleTable headers={adminView ? ["Name", "Slug", "SKU", "Status", "Price", "Seller", "View", "Edit", ""] : ["Name", "Slug", "SKU", "Status", "Price", "View", "Edit", ""]}>
            {rows.length === 0 ? (
              <tr>
                <ConsoleTd colSpan={adminView ? 9 : 8} className="py-8 text-center text-[#646464]">
=======
          <ConsoleTable headers={["Name", "Slug", "SKU", "Status", "Price", "", ""]}>
            {rows.length === 0 ? (
              <tr>
                <ConsoleTd colSpan={7} className="py-8 text-center text-[#646464]">
>>>>>>> 878176fce34cf94acc1c0bc23e3e51be6b49ba1b
                  No products yet.
                </ConsoleTd>
              </tr>
            ) : (
              rows.map((p) => (
                <tr key={p.id} className="hover:bg-[#FFFBF3]/80">
                  <ConsoleTd>{p.name}</ConsoleTd>
                  <ConsoleTd>
                    <code className="text-[11px]">{p.slug}</code>
                  </ConsoleTd>
                  <ConsoleTd>
                    <code className="text-[11px]">{p.sku}</code>
                  </ConsoleTd>
                  <ConsoleTd>
                    <Select value={rowStatus[p.id] ?? p.status} onValueChange={(value) => setRowStatus((prev) => ({ ...prev, [p.id]: value }))}>
                      <SelectTrigger className="rounded-lg border border-[#D9D9D1] bg-white px-2 py-1 text-xs w-auto">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statuses.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </ConsoleTd>
                  <ConsoleTd className="font-semibold">Rs.{Number(p.price).toFixed(2)}</ConsoleTd>
                  <ConsoleTd>
                    <Link href={`${basePath}/${p.id}`} className="rounded-full border border-[#7B3010] px-3 py-1.5 text-[11px] font-semibold uppercase text-[#7B3010]">
                      View
                    </Link>
                  </ConsoleTd>
                  <ConsoleTd>
                    <Link href={`${basePath}/${p.id}/edit`} className="rounded-full border border-[#7B3010] px-3 py-1.5 text-[11px] font-semibold uppercase text-[#7B3010]">
                      Edit
                    </Link>
                  </ConsoleTd>
                  <ConsoleTd>
                    <button type="button" onClick={() => saveRowStatus(p.id)} disabled={saving || (rowStatus[p.id] ?? p.status) === p.status} className="rounded-full bg-[#7B3010] px-3 py-1.5 text-[11px] font-semibold uppercase text-white disabled:opacity-40">
                      Save
                    </button>
                  </ConsoleTd>
                </tr>
              ))
            )}
          </ConsoleTable>
        )}
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-7xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-melon text-2xl font-bold text-[#4A1D1F]">{mode === "view" ? "View product" : mode === "edit" ? "Edit product" : "Add product"}</h1>
        <Link href={basePath} className="text-xs font-semibold uppercase text-[#7B3010] underline">
          Back to list
        </Link>
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      {loading && mode === "edit" && <p className="text-sm text-[#646464]">Loading product...</p>}
      <form onSubmit={onSubmit} className="grid gap-3 rounded-2xl border border-[#E8DCC8] bg-white p-4 shadow-sm md:grid-cols-3">
        {mode === "view" ? (
          <>
            <ViewField label="Name" value={name} />
            <ViewField label="Slug" value={slug} />
            <ViewField label="SKU" value={sku} />
            <ViewField label="Sale Price" value={price ? `Rs.${price}` : ""} />
            <ViewField label="Base/MRP" value={basePrice ? `Rs.${basePrice}` : ""} />
            <ViewField label="Discount %" value={discountPercent ? `${discountPercent}%` : ""} />
            <ViewField label="Status" value={status} />
            <ViewField label="Type" value={type} />
            <ViewField label="Food Type" value={foodType} />
            <ViewField label="Category" value={categories.find((c) => c.id === categoryId)?.name || "No category"} />
            <ViewField label="Total Stock" value={totalStock} />
            <ViewField label="Stock Status" value={stockStatus} />
            <ViewField label="Shelf Life" value={shelfLife} />
            <ViewField
              label="Thumbnails"
              value={
                <div className="flex flex-wrap gap-2">
                  {thumbnailUrls.map((url, idx) => (
                    <div key={idx} className="relative group overflow-hidden h-16 w-16 rounded-lg border border-[#D9D9D1]">
                      <img
                        src={url}
                        alt={`Thumbnail ${idx + 1}`}
                        className="h-full w-full object-cover transition-transform group-hover:scale-110"
                      />
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity text-white text-[9px] font-bold"
                      >
                        VIEW
                      </a>
                    </div>
                  ))}
                </div>
              }
            />
            <ViewField
              label="Images"
              value={
                <div className="flex flex-wrap gap-2">
                  {imageUrls.map((url, idx) => (
                    <div key={idx} className="relative group overflow-hidden h-24 w-24 rounded-lg border border-[#D9D9D1]">
                      <img
                        src={url}
                        alt={`Product Image ${idx + 1}`}
                        className="h-full w-full object-cover transition-transform group-hover:scale-110"
                      />
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity text-white text-[9px] font-bold"
                      >
                        VIEW
                      </a>
                    </div>
                  ))}
                </div>
              }
            />
            <ViewField label="Meta Title" value={metaTitle} />
            <ViewField label="Meta Description" value={metaDescription} className="md:col-span-2" />
            <ViewField label="Tags" value={[foodType, tagsCsv].filter(Boolean).join(", ")} className="md:col-span-3" />
            <ViewField label="Description" value={description} className="md:col-span-3" />
          </>
        ) : (
          <>
            <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm" />
            <Input placeholder="Slug" value={slug} onChange={(e) => setSlug(e.target.value)} className="rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm" />
            <Input placeholder="SKU" value={sku} onChange={(e) => setSku(e.target.value)} className="rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm" />
            <Input placeholder="Sale Price" type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm" />
            <Input placeholder="Base/MRP" type="number" step="0.01" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} className="rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm" />
            <Input placeholder="Discount %" type="number" step="0.01" value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} className="rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm" />
            <Select value={status} onValueChange={(value) => setStatus(value as (typeof statuses)[number])}>
              <SelectTrigger className="rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={type} onValueChange={(value) => setType(value as "simple" | "variant")}>
              <SelectTrigger className="rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="variant">variant</SelectItem>
                <SelectItem value="simple">simple</SelectItem>
              </SelectContent>
            </Select>
            <Select value={foodType} onValueChange={(value) => setFoodType((value as "" | "veg" | "non-veg") || "")}>
              <SelectTrigger className="rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm">
                <SelectValue placeholder="Select veg/non-veg" />
              </SelectTrigger>
              <SelectContent>
                {foodTypes.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryId} onValueChange={(value) => setCategoryId(value || "")}>
              <SelectTrigger className="rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm">
                <SelectValue placeholder="No category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c, idx) => (
                  <SelectItem key={`${c.id}-${idx}`} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Total Stock" type="number" value={totalStock} onChange={(e) => setTotalStock(e.target.value)} className="rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm" />
            <Select value={stockStatus} onValueChange={(value) => setStockStatus(value as "in_stock" | "out_of_stock")}>
              <SelectTrigger className="rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in_stock">in_stock</SelectItem>
                <SelectItem value="out_of_stock">out_of_stock</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Shelf Life" value={shelfLife} onChange={(e) => setShelfLife(e.target.value)} className="rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm" />
            <div className="rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm">
              <p className="mb-2 text-[11px] font-semibold uppercase text-[#646464]">Upload thumbnails (multiple)</p>
              <input type="file" multiple accept="image/*" onChange={(e) => void uploadMany(e.target.files, "thumbnail")} />
              {thumbnailUrls.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {thumbnailUrls.map((url, idx) => (
                    <button
                      key={`${url}-${idx}`}
                      type="button"
                      onClick={() => setThumbnailUrls((prev) => prev.filter((x) => x !== url))}
                      className="rounded-full border border-[#D9D9D1] bg-white px-2 py-0.5 text-[10px]"
                    >
                      Thumb {idx + 1} x
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm">
              <p className="mb-2 text-[11px] font-semibold uppercase text-[#646464]">Upload images (multiple)</p>
              <input type="file" multiple accept="image/*" onChange={(e) => void uploadMany(e.target.files, "image")} />
              {imageUrls.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {imageUrls.map((url, idx) => (
                    <button
                      key={`${url}-${idx}`}
                      type="button"
                      onClick={() => setImageUrls((prev) => prev.filter((x) => x !== url))}
                      className="rounded-full border border-[#D9D9D1] bg-white px-2 py-0.5 text-[10px]"
                    >
                      Image {idx + 1} x
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Input placeholder="Meta Title" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} className="rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm" />
            <Input placeholder="Meta Description" value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} className="rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm md:col-span-2" />
            <Input placeholder="Tags csv: veg, rice, ready-to-eat" value={tagsCsv} onChange={(e) => setTagsCsv(e.target.value)} className="rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm md:col-span-3" />
            <Textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm md:col-span-3" />
          </>
        )}

        <div className="md:col-span-3 space-y-3 rounded-xl border border-[#E8DCC8] p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#4A1D1F]">Custom Sections</p>
            {mode !== "view" ? (
                <button
                  type="button"
                  onClick={() =>
                    setSections((prev) =>
                      prev.length >= MAX_SECTIONS
                        ? prev
                        : [...prev, { title: "", description: "<p></p>", sortOrder: prev.length, isActive: true }],
                    )
                  }
                  className="rounded-full border border-[#7B3010] px-3 py-1 text-[11px] font-semibold uppercase text-[#7B3010]"
                >
                  Add Section
                </button>
              ) : null}
          </div>
          {sections.map((section, idx) => (
            <div key={`${section.id ?? "new"}-${idx}`} className="space-y-2 rounded-lg border border-[#D9D9D1] bg-[#FFFBF3] p-3">
              {mode === "view" ? (
                <div className="grid gap-2 md:grid-cols-3">
                  <ViewField label="Section title" value={section.title} className="md:col-span-2" />
                  <div className="flex items-center gap-2">
                    <ViewField label="Order" value={section.sortOrder} />
                    <ViewField label="Status" value={section.isActive ? "Active" : "Inactive"} />
                  </div>
                </div>
              ) : (
                <div className="grid gap-2 md:grid-cols-3">
                  <Input
                    placeholder="Section title"
                    value={section.title}
                    onChange={(e) =>
                      setSections((prev) =>
                        prev.map((item, itemIdx) =>
                          itemIdx === idx ? { ...item, title: e.target.value } : item,
                        ),
                      )
                    }
                    className="rounded-lg border border-[#D9D9D1] bg-white px-3 py-2 text-sm md:col-span-2"
                  />
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Order"
                      type="number"
                      value={section.sortOrder}
                      onChange={(e) =>
                        setSections((prev) =>
                          prev.map((item, itemIdx) =>
                            itemIdx === idx ? { ...item, sortOrder: Number(e.target.value || 0) } : item,
                          ),
                        )
                      }
                      className="w-20 rounded-lg border border-[#D9D9D1] bg-white px-2 py-2 text-sm"
                    />
                    <label className="flex items-center gap-1 text-[11px] font-semibold uppercase">
                      <Checkbox
                        checked={section.isActive}
                        onCheckedChange={(checked) =>
                          setSections((prev) =>
                            prev.map((item, itemIdx) =>
                              itemIdx === idx ? { ...item, isActive: !!checked } : item,
                            ),
                          )
                        }
                      />
                      active
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setSections((prev) =>
                          prev.length === 1 ? prev : prev.filter((_, itemIdx) => itemIdx !== idx),
                        )
                      }
                      className="rounded-full border border-red-300 px-2 py-1 text-[10px] font-semibold uppercase text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}

              {mode === "view" ? (
                <div className="rounded-lg border border-[#D9D9D1] bg-white px-3 py-2 text-sm" dangerouslySetInnerHTML={{ __html: section.description }} />
              ) : (
                <RichTextEditor
                  value={section.description}
                  onChange={(html) =>
                    setSections((prev) =>
                      prev.map((item, itemIdx) =>
                        itemIdx === idx ? { ...item, description: html } : item,
                      ),
                    )
                  }
                />
              )}
            </div>
          ))}
          <p className="text-[11px] text-[#646464]">Up to {MAX_SECTIONS} sections. Title and description are required.</p>
        </div>
        <div className="md:col-span-3 flex flex-wrap gap-4 text-xs uppercase">
          {mode === "view" ? (
            <>
              <ViewField label="Tax Included" value={taxIncluded ? "Yes" : "No"} />
              <ViewField label="Active" value={isActive ? "Yes" : "No"} />
              <ViewField label="Featured" value={isFeatured ? "Yes" : "No"} />
              <ViewField label="Best Seller" value={isBestSeller ? "Yes" : "No"} />
            </>
          ) : (
            <>
              <label className="flex items-center gap-2">
                <Checkbox checked={taxIncluded} onCheckedChange={(checked) => setTaxIncluded(!!checked)} /> tax included
              </label>
              <label className="flex items-center gap-2">
                <Checkbox checked={isActive} onCheckedChange={(checked) => setIsActive(!!checked)} /> active
              </label>
              <label className="flex items-center gap-2">
                <Checkbox checked={isFeatured} onCheckedChange={(checked) => setIsFeatured(!!checked)} /> featured
              </label>
              <label className="flex items-center gap-2">
                <Checkbox checked={isBestSeller} onCheckedChange={(checked) => setIsBestSeller(!!checked)} /> best seller
              </label>
            </>
          )}
        </div>
        {mode !== "view" && (
          <div className="md:col-span-3">
            <Button type="submit" disabled={saving || uploading} className="rounded-full bg-[#7B3010] px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-white disabled:opacity-50">
              {saving ? "Saving..." : mode === "edit" ? "Update product" : "Create product"}
            </Button>
          </div>
        )}
      </form>
    </section>
  )
}
