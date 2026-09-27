-- Supabase Data API hardening for the Anjuman-e-Araian application.
--
-- Architecture note:
-- This application uses its own Express API + Prisma/PostgreSQL connection.
-- Browser clients do NOT use supabase-js/PostgREST/GraphQL directly.
--
-- Therefore public database tables should remain server-only by default.
-- The migration explicitly removes Data API table privileges from browser roles
-- and preserves full access for service_role should a trusted server-side Supabase
-- integration be introduced later.
--
-- IMPORTANT: If a future table is intentionally exposed through Supabase Data API,
-- grant only the minimum required privileges in the SAME migration that creates it,
-- and add appropriate RLS policies.

REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Future tables/sequences created by the migration role remain server-only unless
-- a later migration explicitly opts them into Data API access.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL PRIVILEGES ON TABLES FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL PRIVILEGES ON SEQUENCES FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL PRIVILEGES ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL PRIVILEGES ON SEQUENCES TO service_role;

-- Example for a FUTURE intentionally public read-only table:
--   ALTER TABLE public."PublicDirectoryView" ENABLE ROW LEVEL SECURITY;
--   GRANT SELECT ON public."PublicDirectoryView" TO anon, authenticated;
--   CREATE POLICY "public read"
--     ON public."PublicDirectoryView"
--     FOR SELECT
--     TO anon, authenticated
--     USING (true);
--
-- Never expose finance, payment, audit, authentication, private member,
-- matrimonial/private matching, OTP, or stored-file tables directly to anon.
