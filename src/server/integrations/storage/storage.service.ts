import fs from "node:fs/promises"
import path from "node:path"
import { env } from "@/src/server/core/config/env"

const toPublicUrl = (relativePath: string) => {
  const normalized = relativePath.replaceAll("\\", "/").replace(/^\/+/, "")
  return `/api/v1/uploads/${normalized}`
}

export const storageService = {
  /**
   * Stores file bytes on VPS filesystem and returns CloudFront URL.
   * CloudFront origin should point to the VPS storage root.
   */
  async saveFile(input: { folder: string; fileName: string; buffer: Uint8Array }) {
    const safeFolder = input.folder.replace(/\.\./g, "").replace(/^\/+/, "")
    const safeFile = input.fileName.replace(/\.\./g, "")
    const relativePath = path.posix.join(safeFolder, safeFile)
    const absolutePath = path.join(env.STORAGE_LOCAL_PATH, relativePath)
    await fs.mkdir(path.dirname(absolutePath), { recursive: true })
    await fs.writeFile(absolutePath, input.buffer)
    return {
      relativePath,
      url: toPublicUrl(relativePath),
    }
  },
}
