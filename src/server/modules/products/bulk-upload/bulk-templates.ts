import * as XLSX from "xlsx"
import {
  SIMPLE_SHEET,
  VARIANT_CHILD_SHEET,
  VARIANT_PARENT_SHEET,
} from "@/src/server/modules/products/bulk-upload/bulk-upload.constants"

const instructionsSimple = [
  ["Bulk import — Simple products"],
  [""],
  ["Required columns: sku, name, slug, type (= simple), price, thumbnail."],
  ["Thumbnail / gallery: use filenames that appear in your images ZIP, or rely on {sku}-thumb.jpg and {sku}-1.jpg style names."],
  ["Category: match an existing category name or slug (case-insensitive)."],
  ["Tags: comma-separated tag names or slugs (must already exist)."],
  ["Status values: draft | published | archived. Leave draft for incomplete catalog data."],
]

const instructionsVariant = [
  ["Bulk import — Variant products"],
  [""],
  ["Sheet", VARIANT_PARENT_SHEET, "defines one row per parent product."],
  ["Sheet", VARIANT_CHILD_SHEET, "defines variants; parentSku must match a row in", VARIANT_PARENT_SHEET],
  ["Each parent needs at least one variant. Exactly one variant should have isDefault = true (or the first variant is used)."],
  ["Variant SKU must be globally unique and different from the parent SKU."],
]

export const buildSimpleTemplateBuffer = (): Buffer => {
  const headers = [
    "sku",
    "name",
    "slug",
    "type",
    "price",
    "basePrice",
    "discountPercent",
    "weight",
    "status",
    "stockStatus",
    "totalStock",
    "category",
    "tags",
    "shelfLife",
    "preparationType",
    "spiceLevel",
    "thumbnail",
    "galleryImages",
    "metaTitle",
    "metaDescription",
    "amazonLink",
    "description",
    "taxIncluded",
    "isActive",
    "isFeatured",
    "isBestSeller",
    "allowReturn",
  ]
  const example = [
    "APP001",
    "Sample Ready Meal",
    "sample-ready-meal",
    "simple",
    "299",
    "349",
    "10",
    "500g",
    "draft",
    "in_stock",
    "120",
    "Meals",
    "bestseller, spicy",
    "6 months",
    "ready_to_eat",
    "medium",
    "APP001-thumb.jpg",
    "APP001-1.jpg,APP001-2.jpg",
    "Sample Ready Meal | Ziply5",
    "Heat and eat sample product.",
    "",
    "<p>Short description HTML optional.</p>",
    "true",
    "true",
    "false",
    "false",
    "true",
  ]
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([headers, example])
  XLSX.utils.book_append_sheet(wb, ws, SIMPLE_SHEET)
  const ins = XLSX.utils.aoa_to_sheet(instructionsSimple)
  XLSX.utils.book_append_sheet(wb, ins, "Instructions")
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer
}

export const buildVariantTemplateBuffer = (): Buffer => {
  const parentHeaders = [
    "parentSku",
    "name",
    "slug",
    "type",
    "status",
    "category",
    "tags",
    "thumbnail",
    "galleryImages",
    "metaTitle",
    "metaDescription",
    "description",
    "taxIncluded",
    "isActive",
    "isFeatured",
    "isBestSeller",
    "allowReturn",
  ]
  const parentExample = [
    "TSHIRT001",
    "Sample Variant Tee",
    "sample-variant-tee",
    "variant",
    "draft",
    "Apparel",
    "new",
    "TSHIRT001-thumb.jpg",
    "TSHIRT001-1.jpg,TSHIRT001-2.jpg",
    "Sample Tee",
    "Cotton tee with size options.",
    "<p>Parent description</p>",
    "true",
    "true",
    "false",
    "false",
    "true",
  ]
  const variantHeaders = [
    "parentSku",
    "variantSku",
    "variantName",
    "weight",
    "price",
    "basePrice",
    "discountPercent",
    "stock",
    "isDefault",
    "status",
  ]
  const variantExamples = [
    ["TSHIRT001", "TSHIRT001-S", "Small", "200g", "599", "699", "5", "40", "false", "published"],
    ["TSHIRT001", "TSHIRT001-M", "Medium", "220g", "599", "699", "5", "60", "true", "published"],
    ["TSHIRT001", "TSHIRT001-L", "Large", "240g", "649", "749", "5", "35", "false", "published"],
  ]
  const wb = XLSX.utils.book_new()
  const wsP = XLSX.utils.aoa_to_sheet([parentHeaders, parentExample])
  XLSX.utils.book_append_sheet(wb, wsP, VARIANT_PARENT_SHEET)
  const wsV = XLSX.utils.aoa_to_sheet([variantHeaders, ...variantExamples])
  XLSX.utils.book_append_sheet(wb, wsV, VARIANT_CHILD_SHEET)
  const ins = XLSX.utils.aoa_to_sheet(instructionsVariant)
  XLSX.utils.book_append_sheet(wb, ins, "Instructions")
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer
}
