import fs from "node:fs/promises"
import path from "node:path"
import { Pool } from "pg"

const DATABASE_URL = process.env.DATABASE_URL
const STORAGE_LOCAL_PATH = process.env.STORAGE_LOCAL_PATH || "/var/www/assets"
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required")
  process.exit(1)
}

const pool = new Pool({ connectionString: DATABASE_URL })

const toRelative = (url) => {
  const raw = String(url || "").trim()
  if (!raw) return null
  if (raw.startsWith("/api/v1/uploads/")) return raw.replace("/api/v1/uploads/", "")
  if (raw.startsWith("/")) return raw.replace(/^\/+/, "")
  return null
}

const run = async () => {
  const client = await pool.connect()
  try {
    const products = await client.query(`SELECT id, slug, thumbnail FROM "Product"`)
    let copied = 0
    for (const row of products.rows) {
      const relative = toRelative(row.thumbnail)
      if (!relative) continue
      const absolute = path.join(STORAGE_LOCAL_PATH, relative)
      await fs.access(absolute).catch(() => null)
      copied += 1
    }
    console.log(`Scanned ${products.rows.length} products. Existing local files: ${copied}`)
  } finally {
    client.release()
    await pool.end()
  }
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
