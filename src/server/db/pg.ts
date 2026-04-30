import { Pool } from "pg"
import { env } from "@/src/server/core/config/env"

const globalForPg = globalThis as unknown as { __ziply5_pgPool?: Pool }

export const pg =
  globalForPg.__ziply5_pgPool ??
  new Pool({
    connectionString: env.DATABASE_URL,
    max: Number(process.env.PG_POOL_MAX ?? "10"),
    idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS ?? "30000"),
    connectionTimeoutMillis: Number(process.env.PG_CONN_TIMEOUT_MS ?? "10000"),
  })

if (process.env.NODE_ENV !== "production") {
  globalForPg.__ziply5_pgPool = pg
}

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

