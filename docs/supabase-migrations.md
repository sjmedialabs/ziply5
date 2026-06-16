# Supabase schema changes

This project stores **raw SQL** only—no Prisma schema.

- **`supabase/sql/`** — larger or manual bundles (`init.sql`, feature foundations, grants).
- **`supabase/migrations/`** — small, timestamp-prefixed deltas (e.g. `20260502120000_cms_page_meta_seo.sql`).

## Applying changes

Use the Supabase dashboard **SQL Editor**, or:

```bash
pnpm db:migrate
```

That runs `scripts/apply-supabase-migrations.mjs`, which applies every file in `supabase/migrations/` that is not already recorded in `supabase_migrations.schema_migrations`.

Set **`DIRECT_URL`** in `.env` to a **session/direct** Postgres URL (port **5432**). DDL migrations often fail against the transaction pooler (port **6543**).

Manual single-file apply:

```bash
psql "$DIRECT_URL" -f supabase/sql/init.sql
psql "$DIRECT_URL" -f supabase/migrations/20260502120000_cms_page_meta_seo.sql
```

Add new deltas as new files under `supabase/migrations/` with a `YYYYMMDDHHMMSS_description.sql` name so ordering stays obvious.
