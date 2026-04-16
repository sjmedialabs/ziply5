import { prisma } from "@/src/server/db/prisma"

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

export const listBundles = async () => {
  return prisma.bundle.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      product: { select: { id: true, name: true, slug: true } },
      items: {
        orderBy: { sortOrder: "asc" },
        include: {
          product: { select: { id: true, name: true, slug: true } },
          variant: { select: { id: true, name: true, sku: true } },
        },
      },
    },
  })
}

export const createBundle = async (input: {
  name: string
  slug?: string
  productId?: string | null
  pricingMode?: "fixed" | "dynamic"
  isCombo?: boolean
  isActive?: boolean
  items: Array<{
    productId: string
    variantId?: string | null
    quantity: number
    isOptional?: boolean
    minSelect?: number
    maxSelect?: number | null
    sortOrder?: number
  }>
}) => {
  const slug = slugify(input.slug ?? input.name)
  return prisma.bundle.create({
    data: {
      name: input.name.trim(),
      slug,
      productId: input.productId ?? undefined,
      pricingMode: input.pricingMode ?? "fixed",
      isCombo: input.isCombo ?? true,
      isActive: input.isActive ?? true,
      items: {
        create: input.items.map((item, idx) => ({
          productId: item.productId,
          variantId: item.variantId ?? undefined,
          quantity: item.quantity,
          isOptional: item.isOptional ?? false,
          minSelect: item.minSelect ?? 0,
          maxSelect: item.maxSelect ?? null,
          sortOrder: item.sortOrder ?? idx,
        })),
      },
    },
    include: {
      items: true,
    },
  })
}
