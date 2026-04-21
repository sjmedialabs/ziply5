export type StorefrontProduct = {
  id: string
  name: string
  slug: string
  sku: string
  productKind: "simple" | "variant"
  price: number
  oldPrice: number
  discountPercent?: number
  stockStatus?: string
  stock?: number
  description: string
  image: string
  gallery: string[]
  videoUrl: string | null
  weight: string
  type: "veg" | "non-veg"
  category: string
  labels: Array<{ label: string; color: string | null }>
  features: Array<{ title: string; icon: string | null }>
  details: Array<{ title: string; content: string }>
  sections: Array<{ id: string; title: string; description: string; sortOrder: number; isActive: boolean }>
  variants: Array<{ id: string; name: string; weight: string; price: number; sku: string; stock: number; isDefault: boolean; discountPercent?: number | null; finalPrice?: number | null; promotion?: { name: string; kind: string } | null }>
  discountPercent?: number | null
  finalPrice?: number | null
  promotion?: { name: string; kind: string } | null
}

type ApiProduct = {
  id: string
  name: string
  slug: string
  sku: string
  description?: string
  stockStatus?: string
  stock?: number
  price: string | number
  basePrice?: string | number | null
  salePrice?: string | number | null
  discountPercent?: string | number | null
  finalPrice?: string | number | null
  promotion?: { name: string; kind: string } | null
  thumbnail?: string | null
  videoUrl?: string | null
  images?: Array<{ url: string }>
  type?: "simple" | "variant"
  variants?: Array<{ id: string; name: string; weight?: string | null; price: string | number; sku: string; stock: number; isDefault?: boolean; discountPercent?: number | null; finalPrice?: number | null; promotion?: { name: string; kind: string } | null }>
  tags?: Array<{ tag: { name: string } }>
  labels?: Array<{ label: string; color: string | null }>
  features?: Array<{ title: string; icon: string | null }>
  details?: Array<{ title: string; content: string }>
  sections?: Array<{ id: string; title: string; description: string; sortOrder: number; isActive: boolean }>
  categories?: Array<{ category: { slug: string } }>
}

const DEFAULT_IMAGE = "/assets/product listing/Ziply5 - Pouch - Butter Chk Rice 3.png"

const toLocalUploadsPath = (value: string) => {
  const clean = value.replace(/^\/+/, "")
  return clean ? `/api/v1/uploads/${clean}` : null
}

const normalizeMediaUrl = (value: string | null | undefined) => {
  const raw = (value ?? "").trim()
  if (!raw) return null
  // Keep local upload-proxy URLs as-is in local/dev.
  if (raw.startsWith("/api/v1/uploads/")) {
    return raw
  }
  // Local assets (or already-local paths) should be returned as-is.
  if (raw.startsWith("/")) return raw
  if (/^https?:\/\//i.test(raw)) {
    try {
      const parsed = new URL(raw)
      if (parsed.hostname === "cdn.ziply5.com") {
        // CDN may be unavailable in local/dev; rewrite to local uploads route.
        return toLocalUploadsPath(parsed.pathname)
      }
      return raw
    } catch {
      return null
    }
  }
  // Handle plain relative media keys/paths coming from legacy rows.
  return toLocalUploadsPath(raw)
}

export const toStorefrontProduct = (p: ApiProduct): StorefrontProduct => {
  const variants = p.variants ?? []
  const firstVariant = variants[0]
  const sale = Number(p.salePrice ?? firstVariant?.price ?? p.price ?? 0)
  const oldPrice = Number(p.basePrice ?? sale * 1.2)
  const tags = (p.tags ?? []).map((t) => t.tag.name.toLowerCase())
  const isVeg = tags.some((t) => t === "veg" || t === "vegetarian")
  const sections =
    (p.sections ?? [])
      .filter((s) => s.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder) ??
    []
  const fallbackDetails = p.details ?? []
  const normalizedThumb = normalizeMediaUrl(p.thumbnail)
  const normalizedGallery = (p.images ?? [])
    .map((i) => normalizeMediaUrl(i.url))
    .filter((url): url is string => Boolean(url))
  return {
    id: p.id || "0",
    name: p.name || "Unknown Product",
    slug: p.slug || `product-${p.id}`,
    sku: p.sku || p.slug.replace(/-/g, "").slice(0, 6).toUpperCase(),
    productKind: p.type ?? (variants.length ? "variant" : "simple"),
    price: sale || 0,
    oldPrice: oldPrice || 0,
    discountPercent: p.discountPercent ? Number(p.discountPercent) : null,
    finalPrice: p.finalPrice ? Number(p.finalPrice) : null,
    promotion: p.promotion ?? null,
    description: p.description ?? "Delicious ready meal.",
    image: normalizedThumb ?? normalizedGallery[0] ?? DEFAULT_IMAGE,
    gallery: normalizedGallery ?? [DEFAULT_IMAGE],
    videoUrl: p.videoUrl ?? null,
    weight: firstVariant?.weight ?? firstVariant?.name ?? "250g",
    type: isVeg ? "veg" : "non-veg",
    category: p.categories?.[0]?.category.slug ?? "all",
    labels: p.labels ?? [],
    features: p.features ?? [],
    details:
      sections.length > 0
        ? sections.map((s) => ({ title: s.title, content: s.description }))
        : fallbackDetails,
    sections,
    variants: variants.map((v) => ({
      id: v.id,
      name: v.name,
      weight: v.weight ?? v.name ?? "",
      price: Number(v.price ?? 0),
      sku: v.sku,
      stock: v.stock ?? 0,
      isDefault: Boolean(v.isDefault),
      discountPercent: v.discountPercent ? Number(v.discountPercent) : null,
      finalPrice: v.finalPrice ? Number(v.finalPrice) : null,
      promotion: v.promotion ?? null,
    })) || [], } 
}
