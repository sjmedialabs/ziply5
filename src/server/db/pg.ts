import { Pool } from "pg"
import { env } from "@/src/server/core/config/env"

const globalForPg = globalThis as unknown as { __ziply5_pgPool?: Pool }

function sanitizeDatabaseUrl(raw: string): string {
  // Common dev footgun: passwords containing "@" must be URL-encoded as "%40".
  // Example bad:  postgresql://user:pa@ss@host:5432/db
  // Example good: postgresql://user:pa%40ss@host:5432/db
  const protocolIdx = raw.indexOf("://")
  if (protocolIdx === -1) return raw
  const afterProtocol = raw.slice(protocolIdx + 3)
  const firstSlash = afterProtocol.indexOf("/")
  if (firstSlash === -1) return raw
  const authority = afterProtocol.slice(0, firstSlash)

  const atCount = (authority.match(/@/g) ?? []).length
  if (atCount <= 1) return raw

  const lastAt = authority.lastIndexOf("@")
  const userInfo = authority.slice(0, lastAt)
  const hostInfo = authority.slice(lastAt + 1)

  const colon = userInfo.indexOf(":")
  if (colon === -1) return raw
  const user = userInfo.slice(0, colon)
  const pass = userInfo.slice(colon + 1)

  // Only patch unescaped '@' to avoid double-encoding.
  const fixedPass = pass.includes("%40") ? pass : pass.replaceAll("@", "%40")
  const fixedAuthority = `${user}:${fixedPass}@${hostInfo}`
  return raw.slice(0, protocolIdx + 3) + fixedAuthority + afterProtocol.slice(firstSlash)
}

const connectionString = sanitizeDatabaseUrl(env.DATABASE_URL)

export const pg =
  globalForPg.__ziply5_pgPool ??
  new Pool({
    connectionString,
    max: Number(process.env.PG_POOL_MAX ?? "10"),
    idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS ?? "30000"),
    connectionTimeoutMillis: Number(process.env.PG_CONN_TIMEOUT_MS ?? "10000"),
    query_timeout: Number(process.env.PG_QUERY_TIMEOUT_MS ?? "30000"),
  })

if (process.env.NODE_ENV !== "production") {
  globalForPg.__ziply5_pgPool = pg
}

pg.on("error", err => {
  // Keep the dev server alive on transient pool errors.
  console.error("[pg] pool error", err)
})

export async function pgQuery<T = any>(text: string, values: any[] = []) {
  const res = await pg.query(text, values)
  return res.rows as T[]
}

export async function pgTx<T>(fn: (client: import("pg").PoolClient) => Promise<T>) {
  const client = await pg.connect()
  try {
    await client.query("BEGIN")
    const out = await fn(client)
    await client.query("COMMIT")
    return out
  } catch (e) {
    await client.query("ROLLBACK").catch(() => null)
    throw e
  } finally {
    client.release()
  }
}

