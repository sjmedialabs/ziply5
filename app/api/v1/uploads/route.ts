import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { storageService } from "@/src/server/integrations/storage/storage.service"

const safeName = (value: string) =>
  value
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")

export async function POST(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth

  const form = await request.formData()
  const folderRaw = String(form.get("folder") ?? "misc").trim()
  const folder = folderRaw.replace(/\.\./g, "").replace(/^\/+/, "").replace(/\/+$/, "") || "misc"

  const allFiles = [
    ...form.getAll("files"),
    ...form.getAll("file"),
  ].filter((entry): entry is File => entry instanceof File)

  if (allFiles.length === 0) return fail("No files uploaded", 400)

  const uploaded = []
  for (const file of allFiles) {
    if (!file.name) continue
    const bytes = new Uint8Array(await file.arrayBuffer())
    const stampedName = `${Date.now()}-${safeName(file.name)}`
    const saved = await storageService.saveFile({
      folder,
      fileName: stampedName,
      buffer: bytes,
    })
    uploaded.push({
      name: file.name,
      size: file.size,
      type: file.type,
      ...saved,
    })
  }

  return ok({ files: uploaded }, "Uploaded")
}
