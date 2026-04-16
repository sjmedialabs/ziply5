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
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

type Mode = "list" | "add" | "edit" | "view"

type ProductRow = {
  id: string
  name: string
  slug: string
  sku: string
  status: string
  price: string | number
  isActive?: boolean
  // seller?: { email: string; name: string } | null
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
  features?: Array<{ title: string; icon?: string | null }>
  createdById?: string | null
}

const ViewField = ({ label, value, className = "" }: { label: string; value: React.ReactNode; className?: string }) => (
  <div className={`flex flex-col gap-1 rounded-lg w-full border border-[#D9D9D1] bg-[#FDFDFD] px-3 py-2 text-sm ${className}`}>
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

const Card = ({ title, children }: any) => (
  <div className="bg-white rounded-2xl p-4 border border-[#E5E5DC] shadow-sm">
    <p className="font-semibold mb-3 text-[#4A1D1F]">{title}</p>
    <div className="space-y-2 text-sm">{children}</div>
  </div>
)

const Info = ({ label, value }: any) => (
  <div className="flex justify-between">
    <span className="text-gray-500">{label}</span>
    <span className="font-medium text-[#2A1810]">{value || "—"}</span>
  </div>
)

const Badge = ({ label }: any) => (
  <span className="text-xs bg-[#F5F1E6] px-2 py-1 rounded-full border">
    {label}
  </span>
)

const Field = ({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) => (
  <div className="space-y-2">
    <Label className="text-xs font-semibold uppercase text-[#4A1D1F]">
      {label}
      {required ? <span className="ml-1 text-red-500">*</span> : null}
    </Label>
    {children}
  </div>
)

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
  const [features, setFeatures] = useState<Array<{ title: string; icon?: string | null }>>([])
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
  const [createdBy, setCreatedBy] = useState("user_admin_ziply5")
  const [sections, setSections] = useState<Array<{ id?: string; title: string; description: string; sortOrder: number; isActive: boolean }>>([
    { title: "Key Features", description: "<ul><li></li></ul>", sortOrder: 0, isActive: true },
  ])

  const orderedSections = useMemo(
    () => [...sections].sort((a, b) => a.sortOrder - b.sortOrder),
    [sections],
  )

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
      setCreatedBy(p.createdById ?? "user_admin_ziply5")
      setFeatures(p.features ?? [])
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
      status: status,
      type: type,
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
      features: features
        .map((f) => ({ title: f.title.trim(), icon: f.icon }))
        .filter((f) => f.title)
        .slice(0, 10),
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
    features,
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

    const isPublishing = status === "published"

    if (isPublishing) {
      if (!payload.price || payload.price <= 0) {
        setError("Provide at least one valid price to publish the product")
        return
      }
      if (!foodType) {
        setError("Veg / Non-veg selection is required to publish")
        return
      }
      if (payload.sections.length === 0) {
        setError("At least one product section is required to publish")
        return
      }
      if (payload.features.length === 0) {
        setError("At least one product feature is required to publish")
        return
      }
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

  const toggleRowActive = async (id: string, current: boolean) => {
    setSaving(true)
    setError("")
    try {
      await authedPatch(`/api/v1/products/${id}`, { isActive: !current })
      await loadList()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Active toggle failed")
    } finally {
      setSaving(false)
    }
  }

  if (mode === "list") {
    return (
      <section className="mx-auto max-w-7xl space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-melon text-2xl font-bold text-[#4A1D1F]">{adminView ? "Products" : "My products"}</h1>
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
          <ConsoleTable headers={["Name", "Slug", "SKU", "Status", "Price", "Active", "Actions"]}>
            {rows.length === 0 ? (
              <tr>
                <ConsoleTd colSpan={7} className="py-8 text-center text-[#646464]">
                  No products yet.
                </ConsoleTd>
              </tr>
            ) : (
              rows.map((p) => (
                <tr key={p.id} className="hover:bg-[#FFFBF3]/80">
                  <ConsoleTd className="align-middle">
                    <Link href={`${basePath}/${p.id}`} className="text-[#7B3010] font-semibold hover:underline">
                      {p.name}
                    </Link>
                  </ConsoleTd>
                  <ConsoleTd className="align-middle">
                    <code className="text-[11px]">{p.slug}</code>
                  </ConsoleTd>
                  <ConsoleTd className="align-middle">
                    <code className="text-[11px]">{p.sku}</code>
                  </ConsoleTd>
                  <ConsoleTd className="align-middle">
                    <Select value={rowStatus[p.id] ?? p.status} onValueChange={(value) => setRowStatus((prev) => ({ ...prev, [p.id]: value }))}>
                      <SelectTrigger className="rounded-lg border border-[#D9D9D1] bg-white px-2 text-xs w-auto capitalize" size="sm">
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
                  <ConsoleTd className="align-middle font-semibold">Rs.{Number(p.price).toFixed(2)}</ConsoleTd>
                  <ConsoleTd className="align-middle">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => toggleRowActive(p.id, p.isActive ?? false)}
                      className={`rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase ${p.isActive ? "bg-green-500 text-white" : "bg-gray-200 text-[#4A1D1F]"}`}
                    >
                      {p.isActive ? "Active" : "Inactive"}
                    </button>
                  </ConsoleTd>
                  <ConsoleTd className="align-middle">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`${basePath}/${p.id}`} className="rounded-full border border-[#7B3010] px-3 py-1.5 text-[11px] font-semibold uppercase text-[#7B3010] hover:bg-[#FFFBF3]">
                        View
                      </Link>
                      <Link href={`${basePath}/${p.id}/edit`} className="rounded-full border border-[#7B3010] px-3 py-1.5 text-[11px] font-semibold uppercase text-[#7B3010] hover:bg-[#FFFBF3]">
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => saveRowStatus(p.id)}
                        disabled={saving || (rowStatus[p.id] ?? p.status) === p.status}
                        className="rounded-full bg-[#7B3010] px-3 py-1.5 text-[11px] font-semibold uppercase text-white disabled:opacity-40"
                      >
                        Save
                      </button>
                    </div>
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
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="font-melon text-2xl font-bold text-[#4A1D1F]">{mode === "view" ? "View product" : mode === "edit" ? "Edit product" : "Add product"}</h1>
        <Link href={basePath} className="text-xs font-semibold uppercase text-[#7B3010] underline">
          Back to list
        </Link>
      </div>
      {mode !== "view" && (
        <p className="text-xs text-[#646464]">Draft/archive saves can be partial. Publishing requires valid name, slug, SKU, food type, price, and at least one section.</p>
      )}
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      {loading && mode === "edit" && <p className="text-sm text-[#646464]">Loading product...</p>}
      <form onSubmit={onSubmit} className="grid bg-white gap-3 rounded-2xl border border-[#E8DCC8] p-4 shadow-sm md:grid-cols-3">
        {mode === "view" ? (
          <div className="space-y-6 w-full md:col-span-3">

            {/* 🔥 TOP SECTION */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Basic Info */}
              <div className="bg-white rounded-2xl p-4 border border-[#E5E5DC] space-y-3 shadow-sm">
                <div className="flex justify-between items-center ">
                  <h2 className="text-xl font-bold text-[#4A1D1F]">{name}</h2>

                  <div className="flex items-center gap-3">
                    <span className="text-lg font-semibold text-green-600">
                      ₹{price}
                    </span>
                    {basePrice && (
                      <span className="line-through text-gray-400">
                        ₹{basePrice}
                      </span>
                    )}
                    {discountPercent && (
                      <span className="text-sm bg-green-100 text-green-700 px-2 py-1 rounded">
                        {discountPercent}% OFF
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  SKU: {sku}
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Badge label={foodType} />
                  <Badge label={status} />
                  <Badge label={type} />
                </div>

                <p className="text-sm text-gray-600">
                  Category: {categories.find((c) => c.id === categoryId)?.name || "—"}
                </p>
              </div>
              {/* 💰 PRICING + INVENTORY */}
              <Card title="Pricing">
                <Info label="Sale Price" value={`₹${price}`} />
                <Info label="MRP" value={`₹${basePrice}`} />
                <Info label="Discount" value={`${discountPercent}%`} />
              </Card>

              <Card title="Inventory">
                <Info label="Stock" value={totalStock} />
                <Info label="Stock Status" value={stockStatus} />
                <Info label="Shelf Life" value={shelfLife} />
              </Card>

              {/* 🧾 META */}
              <Card title="SEO & Metadata">
                <Info label="Slug" value={slug} />
                <Info label="Meta Title" value={metaTitle} />
                <Info label="Meta Description" value={metaDescription} />
              </Card>
            </div>

            {/* 📝 DESCRIPTION */}
            <Card title="Description">
              <p className="text-sm text-gray-700 whitespace-pre-line">
                {description}
              </p>
            </Card>

          </div>
        ) : (
          <>
            <Field label="Name" required>
              <Input
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Slug" required>
              <Input
                placeholder="Slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
                className="rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm"
              />
            </Field>
            <Field label="SKU" required>
              <Input
                placeholder="SKU"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                required
                className="rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Sale Price">
              <Input
                placeholder="Sale Price"
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Base / MRP">
              <Input
                placeholder="Base/MRP"
                type="number"
                step="0.01"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                className="rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Discount %">
              <Input
                placeholder="Discount %"
                type="number"
                step="0.01"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                className="rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Status" required>
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
            </Field>
            <Field label="Type">
              <Select value={type} onValueChange={(value) => setType(value as "simple" | "variant")}>
                <SelectTrigger className="rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="variant">variant</SelectItem>
                <SelectItem value="simple">simple</SelectItem>
              </SelectContent>
            </Select>
            </Field>
            <Field label="Food Type" required>
              <Select value={foodType} onValueChange={(value) => setFoodType(value as "" | "veg" | "non-veg")}>
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
            </Field>
            <Field label="Category">
              <Select value={categoryId} onValueChange={(value) => setCategoryId(value || "")}>
              <SelectTrigger className="rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm">
                <SelectValue placeholder="No category" />
              </SelectTrigger>
              <SelectContent>
             
                  <SelectItem value="beafkfast">
                 {categories.length === 0 ? "No categories" : "None"}
                  </SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            </Field>
            <Field label="Total Stock">
              <Input placeholder="Total Stock" type="number" value={totalStock} onChange={(e) => setTotalStock(e.target.value)} className="rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm" />
            </Field>
            <Field label="Stock Status">
              <Select value={stockStatus} onValueChange={(value) => setStockStatus(value as "in_stock" | "out_of_stock")}>
                <SelectTrigger className="rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_stock">in_stock</SelectItem>
                  <SelectItem value="out_of_stock">out_of_stock</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Shelf Life">
              <Input
                placeholder="Shelf Life"
                value={shelfLife}
                onChange={(e) => setShelfLife(e.target.value)}
                className="rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Upload thumbnails (multiple)">
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
            </Field>
            <Field label="Upload images (multiple)">
              <div className="rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm">
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
            </Field>
            <Field label="Meta Title">
              <Input placeholder="Meta Title" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} className="rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm" />
            </Field>
            <Field label="Meta Description">
              <Input placeholder="Meta Description" value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} className="rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm md:col-span-2" />
            </Field>
            <Field label="Tags CSV">
              <Input placeholder="Tags csv: veg, rice, ready-to-eat" value={tagsCsv} onChange={(e) => setTagsCsv(e.target.value)} className="rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm md:col-span-3" />
            </Field>
            <Field label="Description">
              <Textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="rounded-lg border border-[#D9D9D1] px-3 py-2 text-sm md:col-span-3" />
            </Field>
          </>
        )}
        {/* Product Specifications and Details */}
        <div className="md:col-span-3 space-y-3 shadow-sm rounded-xl border border-[#E8DCC8] p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#4A1D1F]">Product Details</p>
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
          {mode === "view" ? (
            <Accordion type="single" collapsible className="space-y-2">
              {orderedSections.map((section, idx) => (
                <AccordionItem
                  key={`${section.id ?? "new"}-${idx}`}
                  value={`section-${section.id ?? idx}`}
                  className={section.isActive ? "rounded-lg border opacity-70 border-[#D9D9D1] bg-[#FFFBF3]" : "rounded-lg border border-[#D9D9D1] bg-[#FFFBF3] opacity-60"}
                >
                  <AccordionTrigger className="px-3 py-4">
                    <div className="flex items-center justify-between gap-4 w-full">
                      <div>
                        <p className="font-semibold text-sm text-[#2A1810]">
                          {idx + 1}. {section.title || "Untitled section"}
                        </p>
                        {/* <p className="text-[11px] text-[#646464]">Order {section.sortOrder}</p> */}
                      </div>
                      {/* <span className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase ${section.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                        {section.isActive ? "Active" : "Inactive"}
                      </span> */}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className={section.isActive ? "px-3" : "px-3 opacity-60"}>
                    <div className="rounded-lg border border-[#D9D9D1] bg-white px-3 py-2 text-sm" dangerouslySetInnerHTML={{ __html: section.description }} />
                  </AccordionContent>
                </AccordionItem>
              ))}
              {features.length > 0 && (
                <AccordionItem value="features" className="rounded-lg border border-[#D9D9D1] bg-[#FFFBF3]">
                  <AccordionTrigger className="px-3 py-4">
                    <p className="font-semibold text-sm text-[#2A1810]">Features</p>
                  </AccordionTrigger>
                  <AccordionContent className="px-3">
                    <ul className="space-y-1">
                      {features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm">
                          {feature.icon && <img src={feature.icon} alt="" className="w-4 h-4" />}
                          <span>{feature.title}</span>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          ) : (
            sections.map((section, idx) => (
              <div key={`${section.id ?? "new"}-${idx}`} className="bg-white shadow-sm space-y-2 rounded-lg border border-[#D9D9D1] bg-[#FFFBF3] p-3">
                <div className="grid gap-2 md:grid-cols-3">
                  <div className="md:col-span-2">
                    <Label className="text-xs font-semibold text-[#4A1D1F]">Section Title</Label>
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
                      className="rounded-lg border border-[#D9D9D1] bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-[#4A1D1F]">Sort Order</Label>
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
                </div>
                <div>
                  <Label className="text-xs font-semibold text-[#4A1D1F]">Description</Label>
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
                </div>
              </div>
            ))
          )}
          <p className="text-[11px] text-[#646464]">Up to {MAX_SECTIONS} sections. Title and description are required.</p>
        </div>
        {/* Product Features */}
        <div className="md:col-span-3 space-y-3 shadow-sm rounded-xl border border-[#E8DCC8] p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#4A1D1F]">Product Features</p>
            {mode !== "view" ? (
              <button
                type="button"
                onClick={() => setFeatures((prev) => [...prev, { title: "", icon: null }])}
                className="rounded-full border border-[#7B3010] px-2 py-1 text-[10px] font-semibold uppercase text-[#7B3010]"
              >
                Add Feature
              </button>
            ) : null}
          </div>
          {features.map((feature, idx) => (
            <div key={idx} className="space-y-2">
              <div className="grid gap-2 md:grid-cols-2">
                <div>
                  <Label className="text-xs font-semibold text-[#4A1D1F]">Feature Title</Label>
                  <input
                    type="text"
                    placeholder="Feature title"
                    value={feature.title}
                    onChange={(e) =>
                      setFeatures((prev) =>
                        prev.map((item, itemIdx) =>
                          itemIdx === idx ? { ...item, title: e.target.value } : item,
                        ),
                      )
                    }
                    className="w-full rounded-lg border border-[#D9D9D1] bg-white px-2 py-2 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-[#4A1D1F]">Icon URL (optional)</Label>
                  <input
                    type="text"
                    placeholder="Icon URL (optional)"
                    value={feature.icon || ""}
                    onChange={(e) =>
                      setFeatures((prev) =>
                        prev.map((item, itemIdx) =>
                          itemIdx === idx ? { ...item, icon: e.target.value || null } : item,
                        ),
                      )
                    }
                    className="w-full rounded-lg border border-[#D9D9D1] bg-white px-2 py-2 text-sm"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setFeatures((prev) =>
                    prev.length === 1 ? prev : prev.filter((_, itemIdx) => itemIdx !== idx),
                  )
                }
                className="rounded-full border border-red-300 px-2 py-1 text-[10px] font-semibold uppercase text-red-700"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        {/* Badge Fields */}
        <div className="md:col-span-3 flex flex-wrap gap-4 text-xs uppercase">
          {mode !== "view" ?
            (
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
            ) : (
              <div className="flex gap-2 w-full">
                <ViewField label="Tax Included" value={taxIncluded ? "Yes" : "No"} />
                <ViewField label="Active" value={isActive ? "Yes" : "No"} />
                <ViewField label="Featured" value={isFeatured ? "Yes" : "No"} />
                <ViewField label="Best Seller" value={isBestSeller ? "Yes" : "No"} />
              </div>
            )}
        </div>
        {/* Images */}
        {mode === "view" && (
          <div className="bg-white md:col-span-3 rounded-2xl p-4 border border-[#E5E5DC] shadow-sm w-full justify-center flex flex-col text-start items-center">
            <div className="w-full"> <p className="font-semibold mb-3 text-[#4A1D1F]">Product Images</p></div>

            <div className="flex flex-wrap gap-4">
              {[...thumbnailUrls, ...imageUrls].map((url, idx) => (
                <img
                  key={idx}
                  src={url}
                  className="h-40 w-auto object-cover rounded-lg border"
                />
              ))}
            </div>
          </div>
        )}
        {/* Save or update button */}
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
