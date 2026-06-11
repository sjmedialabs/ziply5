#!/usr/bin/env node
/**
 * Apply all SQL migrations in supabase/migrations/ to the database behind DIRECT_URL.
 *
 * Usage:
 *   node --env-file=.env scripts/apply-supabase-migrations.mjs
 *
 * Set DIRECT_URL to a session/direct Postgres URL (port 5432). For Supabase Cloud,
 * use the "Session pooler" or direct connection string — not the transaction pooler (6543).
 */
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import pg from "pg"

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL
if (!connectionString) {
  console.error("Set DIRECT_URL (preferred) or DATABASE_URL in the environment.")
  process.exit(1)
}

const isLocal = /localhost|127\.0\.0\.1|::1/i.test(connectionString)
const client = new pg.Client({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false },
})

const migrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "supabase", "migrations")

const main = async () => {
  const files = (await readdir(migrationsDir))
    .filter((f) => f.endsWith(".sql"))
    .sort()

  await client.connect()
  await client.query(`
    CREATE SCHEMA IF NOT EXISTS supabase_migrations;
    CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
      version text PRIMARY KEY,
      name text,
      statements text[]
    );
  `)

  const applied = await client.query(`SELECT version FROM supabase_migrations.schema_migrations`)
  const done = new Set(applied.rows.map((r) => r.version))

  for (const file of files) {
    const version = file.replace(/_.*$/, "").replace(/\.sql$/, "")
    if (done.has(version)) {
      console.log(`skip ${file}`)
      continue
    }
    const sql = await readFile(path.join(migrationsDir, file), "utf8")
    const name = file.replace(/^\d+_/, "").replace(/\.sql$/, "")
    console.log(`apply ${file}`)
    await client.query("BEGIN")
    try {
      await client.query(sql)
      await client.query(
        `INSERT INTO supabase_migrations.schema_migrations(version, name, statements) VALUES ($1, $2, ARRAY[]::text[])`,
        [version, name],
      )
      await client.query("COMMIT")
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    }
  }

  console.log("All migrations applied.")
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
  .finally(() => client.end().catch(() => null))
