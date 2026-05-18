import { Pool } from "pg"

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing")
}

export const pg = new Pool({
  connectionString: databaseUrl,

  ssl: {
    rejectUnauthorized: false,
  },

  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

type PgQueryRows<T> = T extends any[] ? T : T[]

export async function pgQuery<T = any>(text: string, values: any[] = []): Promise<PgQueryRows<T>> {
  const res = await pg.query(text, values)
  return res.rows as PgQueryRows<T>
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
