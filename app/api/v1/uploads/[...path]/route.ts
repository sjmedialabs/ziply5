import fs from "node:fs/promises"
import path from "node:path"
import { NextRequest, NextResponse } from "next/server"
import { env } from "@/src/server/core/config/env"

const contentTypeForExt = (ext: string) => {
  const map: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
  }
  return map[ext.toLowerCase()] ?? "application/octet-stream"
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const params = await context.params
  const parts = (params.path ?? []).filter(Boolean)
  if (parts.length === 0) {
    return NextResponse.json({ success: false, message: "Not found" }, { status: 404 })
  }

  const cleaned = parts.map((part) => part.replace(/\.\./g, ""))
  const relativePath = path.posix.join(...cleaned)
  const absolutePath = path.join(env.STORAGE_LOCAL_PATH, relativePath)

  try {
    const data = await fs.readFile(absolutePath)
    const ext = path.extname(absolutePath)
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": contentTypeForExt(ext),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch {
    return NextResponse.json({ success: false, message: "File not found" }, { status: 404 })
  }
}
