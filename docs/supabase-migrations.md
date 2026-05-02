# Supabase schema changes

This project stores **raw SQL** only—no Prisma schema.

- **`supabase/sql/`** — larger or manual bundles (`init.sql`, feature foundations, grants).
- **`supabase/migrations/`** — small, timestamp-prefixed deltas (e.g. `20260502120000_cms_page_meta_seo.sql`).

## Applying changes

Use the Supabase dashboard **SQL Editor**, or:

```bash
psql "$DIRECT_URL" -f supabase/sql/init.sql
psql "$DIRECT_URL" -f supabase/migrations/20260502120000_cms_page_meta_seo.sql
```

Add new deltas as new files under `supabase/migrations/` with a `YYYYMMDDHHMMSS_description.sql` name so ordering stays obvious.
