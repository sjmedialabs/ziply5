-- Optional fixes (review carefully before running)
-- These are intentionally NOT executed automatically.
--
-- Notes:
-- - Prefer server-side defaults for UUID PKs to avoid app-side `withId()` complexity.
-- - Use `gen_random_uuid()` (pgcrypto) or `uuid_generate_v4()` (uuid-ossp).
-- - Supabase projects typically have `pgcrypto` available.

-- Enable pgcrypto if needed (may already be enabled).
-- create extension if not exists pgcrypto;

-- Template: add default UUID for an `id` PK.
-- alter table public."<TABLE_NAME>" alter column id set default gen_random_uuid();

-- Template: add created_at/updated_at defaults (choose your column names).
-- alter table public."<TABLE_NAME>" alter column created_at set default now();
-- alter table public."<TABLE_NAME>" alter column updated_at set default now();

-- Template: backfill missing ids if you have nullable ids (rare).
-- update public."<TABLE_NAME>" set id = gen_random_uuid() where id is null;

