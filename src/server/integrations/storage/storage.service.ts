import fs from "node:fs/promises"
import path from "node:path"
import crypto from "node:crypto"
import { env } from "@/src/server/core/config/env"
import { logger } from "@/lib/logger"

const toPublicUrl = (relativePath: string) => {
  const normalized = relativePath.replaceAll("\\", "/").replace(/^\/+/, "")
  return `/api/v1/uploads/${normalized}`
}

type AllowedMime = "image/jpeg" | "image/png" | "image/webp" | "image/gif"

const MAX_IMAGE_BYTES = Number(process.env.UPLOAD_IMAGE_MAX_BYTES ?? 8 * 1024 * 1024)
const THUMB_WIDTH = Number(process.env.UPLOAD_IMAGE_THUMB_WIDTH ?? 320)
const MEDIUM_WIDTH = Number(process.env.UPLOAD_IMAGE_MEDIUM_WIDTH ?? 900)

const sanitizeSegment = (value: string) =>
  value
    .replace(/[^a-zA-Z0-9/_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/\.\./g, "")
    .replace(/^\/+|\/+$/g, "")

const sanitizeFileName = (value: string) =>
  value
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\.+/, "")
    .slice(0, 120)

const detectMime = (bytes: Uint8Array): AllowedMime | null => {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg"
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) return "image/png"
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp"
  if (bytes.length >= 6) {
    const hdr = String.fromCharCode(...bytes.slice(0, 6))
    if (hdr === "GIF87a" || hdr === "GIF89a") return "image/gif"
  }
  return null
}

const extForMime = (mime: AllowedMime) => {
  if (mime === "image/jpeg") return ".jpg"
  if (mime === "image/png") return ".png"
  if (mime === "image/webp") return ".webp"
  return ".gif"
}

const validateImage = (buffer: Uint8Array) => {
  if (!buffer?.byteLength) throw new Error("Empty upload")
  if (buffer.byteLength > MAX_IMAGE_BYTES) throw new Error(`Image exceeds ${MAX_IMAGE_BYTES} bytes`)
  const mime = detectMime(buffer)
  if (!mime) throw new Error("Unsupported or invalid image format")
  return mime
}

const buildFileKey = (name: string) => {
  const clean = sanitizeFileName(name || "upload")
  const base = clean.includes(".") ? clean.slice(0, clean.lastIndexOf(".")) : clean
  const hash = crypto.randomBytes(8).toString("hex")
  return `${Date.now()}-${base || "media"}-${hash}`
}

const trySharp = async () => {
  try {
    const mod = await import("sharp")
    return mod.default
  } catch {
    return null
  }
}

export const storageService = {
  /**
   * Stores file bytes on VPS filesystem and returns CloudFront URL.
   * CloudFront origin should point to the VPS storage root.
   */
  async saveFile(input: { folder: string; fileName: string; buffer: Uint8Array }) {
    const safeFolder = sanitizeSegment(input.folder)
    const safeFile = sanitizeFileName(input.fileName)
    const relativePath = path.posix.join(safeFolder, safeFile)
    const absolutePath = path.join(env.STORAGE_LOCAL_PATH, relativePath)
    await fs.mkdir(path.dirname(absolutePath), { recursive: true })
    await fs.writeFile(absolutePath, input.buffer)
    return {
      relativePath,
      url: toPublicUrl(relativePath),
    }
  },

  async deleteFile(relativePath: string) {
    const safe = sanitizeSegment(relativePath)
    if (!safe) return
    const absolutePath = path.join(env.STORAGE_LOCAL_PATH, safe)
    await fs.rm(absolutePath, { force: true }).catch(() => null)
  },

  async saveProductImageSet(input: {
    folder: string
    originalName: string
    buffer: Uint8Array
    replaceRelativePaths?: string[]
  }) {
    const safeFolder = sanitizeSegment(input.folder)
    if (!safeFolder) throw new Error("Invalid folder")
    const mime = validateImage(input.buffer)
    const baseKey = buildFileKey(input.originalName)
    const originalExt = extForMime(mime)
    const originalRel = path.posix.join(safeFolder, `${baseKey}-original${originalExt}`)
    const thumbRel = path.posix.join(safeFolder, `${baseKey}-thumb.webp`)
    const mediumRel = path.posix.join(safeFolder, `${baseKey}-medium.webp`)
    const created: string[] = []
    try {
      await fs.mkdir(path.join(env.STORAGE_LOCAL_PATH, safeFolder), { recursive: true })
      const sharp = await trySharp()
      if (sharp) {
        const source = Buffer.from(input.buffer)
        await fs.writeFile(path.join(env.STORAGE_LOCAL_PATH, originalRel), source)
        created.push(originalRel)
        await sharp(source).resize({ width: THUMB_WIDTH, withoutEnlargement: true }).webp({ quality: 82 }).toFile(path.join(env.STORAGE_LOCAL_PATH, thumbRel))
        created.push(thumbRel)
        await sharp(source).resize({ width: MEDIUM_WIDTH, withoutEnlargement: true }).webp({ quality: 86 }).toFile(path.join(env.STORAGE_LOCAL_PATH, mediumRel))
        created.push(mediumRel)
      } else {
        // Fallback when sharp binary is unavailable on host.
        await fs.writeFile(path.join(env.STORAGE_LOCAL_PATH, originalRel), input.buffer)
        created.push(originalRel)
        await fs.writeFile(path.join(env.STORAGE_LOCAL_PATH, thumbRel), input.buffer)
        created.push(thumbRel)
        await fs.writeFile(path.join(env.STORAGE_LOCAL_PATH, mediumRel), input.buffer)
        created.push(mediumRel)
      }

      for (const oldRel of input.replaceRelativePaths ?? []) {
        await this.deleteFile(oldRel)
      }

      return {
        relativePath: mediumRel,
        url: toPublicUrl(mediumRel),
        variants: {
          original: toPublicUrl(originalRel),
          medium: toPublicUrl(mediumRel),
          thumbnail: toPublicUrl(thumbRel),
        },
      }
    } catch (error) {
      await Promise.all(created.map((rel) => this.deleteFile(rel)))
      logger.warn("storage.save_product_image_set_failed", {
        folder: safeFolder,
        file: input.originalName,
        error: error instanceof Error ? error.message : "unknown",
      })
      throw error
    }
  },
}
