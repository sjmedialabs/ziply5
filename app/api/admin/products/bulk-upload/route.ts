import { NextRequest, NextResponse } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import {
  ALLOWED_EXCEL_MIME,
  ALLOWED_ZIP_MIME,
  BULK_EXCEL_MAX_BYTES,
  BULK_ZIP_MAX_BYTES,
} from "@/src/server/modules/products/bulk-upload/bulk-upload.constants"
import { buildSimpleTemplateBuffer, buildVariantTemplateBuffer } from "@/src/server/modules/products/bulk-upload/bulk-templates"
import { runBulkImport, runBulkValidate } from "@/src/server/modules/products/bulk-upload/bulk-import.service"
import type { BulkUploadType } from "@/src/server/modules/products/bulk-upload/bulk-upload.types"
import { rateLimit, resolveClientIp } from "@/src/server/security/rate-limit"
import { isTrustedOrigin } from "@/src/server/security/csrf"

export const runtime = "nodejs"
export const maxDuration = 300

const isUploadType = (v: string): v is BulkUploadType => v === "simple" || v === "variant"

const guessMimeFromName = (name: string) => {
  const lower = name.toLowerCase()
  if (lower.endsWith(".csv")) return "text/csv"
  if (lower.endsWith(".xlsx")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  if (lower.endsWith(".zip")) return "application/zip"
  return ""
}

export async function GET(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const denied = requirePermission(auth.user.role, "products.create")
  if (denied) return denied

  const template = request.nextUrl.searchParams.get("template") ?? ""
  if (template === "simple") {
    const buf = buildSimpleTemplateBuffer()
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="simple-products-template.xlsx"',
      },
    })
  }
  if (template === "variant") {
    const buf = buildVariantTemplateBuffer()
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="variant-products-template.xlsx"',
      },
    })
  }
  return fail('Use ?template=simple or ?template=variant', 400)
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const denied = requirePermission(auth.user.role, "products.create")
  if (denied) return denied
  if (!isTrustedOrigin(request)) return fail("Invalid origin", 403)
  const ip = resolveClientIp(request.headers)
  const rl = await rateLimit({
    key: `rl:bulk-upload:${ip}`,
    limit: Number(process.env.BULK_UPLOAD_RATE_LIMIT_PER_10M ?? 20),
    windowSec: 10 * 60,
  })
  if (!rl.ok) return fail("Too many bulk upload attempts. Try again later.", 429)

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return fail("Unable to read multipart body (file too large or invalid)", 413)
  }

  const mode = String(form.get("mode") ?? "").toLowerCase()
  const uploadTypeRaw = String(form.get("uploadType") ?? "").toLowerCase()
  if (!isUploadType(uploadTypeRaw)) {
    return fail("uploadType must be simple or variant", 422)
  }
  const uploadType = uploadTypeRaw

  const excelEntry = form.get("excelFile")
  if (!(excelEntry instanceof File)) {
    return fail("excelFile is required", 422)
  }
  const excelBuf = Buffer.from(await excelEntry.arrayBuffer())
  if (excelBuf.length === 0) return fail("excelFile is empty", 422)
  if (excelBuf.length > BULK_EXCEL_MAX_BYTES) {
    return fail(`Excel file exceeds limit of ${BULK_EXCEL_MAX_BYTES} bytes`, 413)
  }
  const excelMime = (excelEntry.type || guessMimeFromName(excelEntry.name)).toLowerCase()
  if (excelMime && !ALLOWED_EXCEL_MIME.has(excelMime) && !excelEntry.name.toLowerCase().endsWith(".csv")) {
    return fail("Unsupported Excel/CSV MIME type", 415)
  }

  const zipEntry = form.get("zipFile")
  let zipBuf: Buffer | null = null
  if (zipEntry instanceof File && zipEntry.size > 0) {
    zipBuf = Buffer.from(await zipEntry.arrayBuffer())
    if (zipBuf.length > BULK_ZIP_MAX_BYTES) {
      return fail(`ZIP file exceeds limit of ${BULK_ZIP_MAX_BYTES} bytes`, 413)
    }
    const zipMime = (zipEntry.type || guessMimeFromName(zipEntry.name)).toLowerCase()
    if (zipMime && !ALLOWED_ZIP_MIME.has(zipMime) && !zipEntry.name.toLowerCase().endsWith(".zip")) {
      return fail("Unsupported ZIP MIME type", 415)
    }
  }

  try {
    if (mode === "validate") {
      const report = await runBulkValidate({
        uploadType,
        excelBuffer: excelBuf,
        zipBuffer: zipBuf,
      })
      return ok(report, "Validation complete")
    }
    if (mode === "import") {
      const report = await runBulkImport({
        uploadType,
        excelBuffer: excelBuf,
        zipBuffer: zipBuf,
        createdById: auth.user.sub,
        fileName: excelEntry.name || "bulk-upload.xlsx",
      })
      return ok(report, "Import finished")
    }
    return fail("mode must be validate or import", 422)
  } catch (e) {
    const message = e instanceof Error ? e.message : "Bulk upload failed"
    return fail(message, 400)
  }
}
