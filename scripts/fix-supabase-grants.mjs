// One-shot script to restore the standard Supabase REST/PostgREST role grants.
// Run via: node --env-file=.env scripts/fix-supabase-grants.mjs
//
// Symptom this addresses:
//   PostgREST returns: { code: "42501", message: "permission denied for schema public" }
//   for both anon and service_role keys, even though Prisma (postgres role) works.
//
// Cause: GRANT USAGE / table privileges for the Supabase API roles were
// removed from the public schema. PostgREST cannot see any tables.
//
// Fix: re-apply the canonical Supabase grants for anon, authenticated and
// service_role (idempotent - safe to re-run).

import { Client } from "pg"

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL
if (!connectionString) {
  console.error("Missing DIRECT_URL / DATABASE_URL in environment")
  process.exit(1)
}

const isLocal = connectionString.includes("localhost") || connectionString.includes("127.0.0.1")
if (!isLocal) {
  // Some Supabase pooler URLs present a cert chain Node doesn't trust by default.
  // This script only runs locally as a one-shot maintenance task.
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"
}

const STATEMENTS = [
  // Schema usage
  `GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role`,

  // Existing objects
  `GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role`,
  `GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role`,
  `GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role`,

  // Future objects created by the postgres role (Prisma migrations run as postgres)
  `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role`,
  `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role`,
  `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role`,

  // Future objects created by the supabase_admin role (Supabase platform default)
  `ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role`,
  `ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role`,
  `ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role`,
]

const run = async () => {
  const client = new Client({
    connectionString,
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
  })
  await client.connect()

  for (const sql of STATEMENTS) {
    try {
      await client.query(sql)
      console.log("OK   ", sql)
    } catch (err) {
      console.error("FAIL ", sql, "->", err.message)
    }
  }

  // Force PostgREST to pick up the new grants immediately.
  try {
    await client.query(`NOTIFY pgrst, 'reload schema'`)
    console.log("OK    NOTIFY pgrst, 'reload schema'")
  } catch (err) {
    console.error("FAIL  NOTIFY pgrst:", err.message)
  }

  await client.end()
}

run()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => {})
