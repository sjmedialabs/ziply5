# Database setup (Supabase Postgres)

Runtime access uses **`pg`** (`DATABASE_URL`) and **`@supabase/supabase-js`** where applicable—not Prisma.

## Symptom

If `/api/v1/products` fails or login reports missing tables, the Postgres database behind **`DATABASE_URL`** does not yet match this repo’s schema.

## Apply schema

1. Set **`DATABASE_URL`** to your Supabase **transaction pooler** URL (often port **6543** with `pgbouncer=true`).
2. Set **`DIRECT_URL`** (if you use scripts that need DDL or session mode) to a suitable Postgres URL (often port **5432**).

In the **Supabase SQL Editor** (or `psql` against `DIRECT_URL`), apply:

- **`supabase/sql/init.sql`** — baseline tables (and related bundled scripts in `supabase/sql/` as your deployment needs).
- **`supabase/migrations/*.sql`** — ordered incremental changes (filenames are timestamp-prefixed; run in chronological order).

Optional: **`supabase/sql/supabase-rest-grants.sql`** — fixes PostgREST “permission denied for schema public” when using the Data API.

After tables exist, seed/auth helpers (e.g. `pnpm seed:auth`) and the app APIs should work against the database.

See **`docs/supabase-migrations.md`** for how we maintain SQL in this repo.
