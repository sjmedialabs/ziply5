-- Restores the canonical Supabase PostgREST grants on the public schema.
-- Apply this whenever the Data API returns:
--   { "code": "42501", "message": "permission denied for schema public" }
--
-- Run via psql:
--   psql "$DIRECT_URL" -f supabase/sql/supabase-rest-grants.sql
-- Or via the bundled Node script:
--   node --env-file=.env scripts/fix-supabase-grants.mjs

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL ON ALL TABLES    IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES  IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON TABLES    TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON ROUTINES  TO anon, authenticated, service_role;

-- Tell PostgREST to reload its schema cache immediately.
NOTIFY pgrst, 'reload schema';
