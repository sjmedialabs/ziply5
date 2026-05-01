export const BULK_UPLOAD_BUCKET = "product-images"

/** Max single file size (bytes) — Excel/CSV */
export const BULK_EXCEL_MAX_BYTES = 25 * 1024 * 1024

/** Max ZIP size (bytes) */
export const BULK_ZIP_MAX_BYTES = 120 * 1024 * 1024

export const BULK_IMPORT_BATCH_SIZE = 25

export const SIMPLE_SHEET = "SimpleProducts"
export const VARIANT_PARENT_SHEET = "VariantProducts"
export const VARIANT_CHILD_SHEET = "Variants"

export const ALLOWED_EXCEL_MIME = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "application/csv",
])

export const ALLOWED_ZIP_MIME = new Set(["application/zip", "application/x-zip-compressed"])
