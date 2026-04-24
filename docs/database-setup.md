# Database setup (Prisma + Supabase)

## Symptom

Errors like `P2021` / `The table public.Product does not exist` mean the Postgres database you connect to with `DATABASE_URL` does not yet have the tables from `prisma/schema.prisma`.

The public storefront can still show products if it reads from static JSON (`lib/products.ts`) instead of the API.

## Standard workflow

1. Set **`DATABASE_URL`** to your Supabase **transaction pooler** URL (often port **6543** with `pgbouncer=true`).
2. Set **`DIRECT_URL`** to a connection Prisma can use for **DDL** (creating tables). If `db.<project>.supabase.co:5432` is unreachable from your network, use the Supabase **session pooler** on port **5432** (same host as the 6543 pooler, different port).
3. Apply schema changes via migrations (never `db push` on shared environments):

```bash
npx prisma migrate dev --name <migration_name>
npx prisma generate
```

For staging/production deploys:

```bash
npx prisma migrate deploy
npx prisma generate
```

If your local DB drifted and you need a clean rebuild:

```bash
npx prisma migrate reset
npx prisma generate
```

After this, `/api/v1/products` and admin product management should work against the database.
