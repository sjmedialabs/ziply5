export type BulkUploadType = "simple" | "variant"

export type BulkRowError = {
  row: number
  sheet?: string
  sku?: string
  message: string
}

export type BulkValidationSummary = {
  uploadType: BulkUploadType
  totalRows: number
  validRows: number
  invalidRows: number
  duplicateSkuInFile: number
  existingSkuConflicts: number
  missingImages: number
  invalidVariants: number
  invalidCategories: number
  invalidPrices: number
}

export type BulkImportRowResult = {
  row: number
  sku?: string
  success: boolean
  message?: string
  productId?: string
}

export type BulkImportReport = {
  summary: BulkValidationSummary
  errors: BulkRowError[]
  results: BulkImportRowResult[]
  failedRowsForCsv: Record<string, string | number | boolean | null>[]
}
