import { authedFormDataPost } from "@/lib/dashboard-fetch"

export type UploadedFilePayload = {
  url?: string
  variants?: { original?: string; medium?: string; thumbnail?: string }
}

export type UploadFilesResponse = { files?: UploadedFilePayload[] }

/** Prefer original asset URL (needed for favicons); otherwise fall back to processed URL. */
export function resolveUploadedPublicUrl(file: UploadedFilePayload): string {
  const v = file.variants?.original ?? file.url
  return typeof v === "string" && v.trim() ? v.trim() : ""
}

export async function uploadAdminImages(files: File[], folder: string): Promise<string[]> {
  if (files.length === 0) return []
  const fd = new FormData()
  for (const f of files) fd.append("files", f)
  fd.append("folder", folder.replace(/^\/+/, "").replace(/\.\./g, "") || "misc")
  const data = await authedFormDataPost<UploadFilesResponse>("/api/v1/uploads", fd)
  return (data.files ?? []).map(resolveUploadedPublicUrl).filter(Boolean)
}

export async function uploadAdminImage(file: File, folder: string): Promise<string> {
  const urls = await uploadAdminImages([file], folder)
  return urls[0] ?? ""
}
