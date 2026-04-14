export type StorefrontProduct = {
  id: string
  name: string
  slug: string
  price: number
  oldPrice: number
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
  variants: Array<{ name: string; price: number; sku: string; stock: number }>
}

type ApiProduct = {
  id: string
  name: string
  slug: string
  description?: string | null
  price: string | number
  basePrice?: string | number | null
  salePrice?: string | number | null
  thumbnail?: string | null
  videoUrl?: string | null
  images?: Array<{ url: string }>
  variants?: Array<{ name: string; weight?: string | null; price: string | number; sku: string; stock: number }>
  tags?: Array<{ tag: { name: string } }>
  labels?: Array<{ label: string; color: string | null }>
  features?: Array<{ title: string; icon: string | null }>
  details?: Array<{ title: string; content: string }>
  sections?: Array<{ id: string; title: string; description: string; sortOrder: number; isActive: boolean }>
  categories?: Array<{ category: { slug: string } }>
}

const DEFAULT_IMAGE = "/assets/product listing/Ziply5 - Pouch - Butter Chk Rice 3.png"

const normalizeMediaUrl = (value: string | null | undefined) => {
  const raw = (value ?? "").trim()
  if (!raw) return null
  if (raw.startsWith("/")) return raw
  if (/^https?:\/\//i.test(raw)) {
    try {
      const parsed = new URL(raw)
      if (parsed.hostname === "cdn.ziply5.com") {
        const cleanPath = parsed.pathname.replace(/^\/+/, "")
        return cleanPath ? `/api/v1/uploads/${cleanPath}` : null
      }
      return raw
    } catch {
      return null
    }
  }
  return null
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
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: sale,
    oldPrice,
    description: p.description ?? "Delicious ready meal.",
    image: normalizedThumb ?? normalizedGallery[0] ?? DEFAULT_IMAGE,
    gallery: normalizedGallery,
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
      name: v.name,
      price: Number(v.price ?? 0),
      sku: v.sku,
      stock: v.stock ?? 0,
    })),
  }
}
