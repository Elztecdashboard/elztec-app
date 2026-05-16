-- Data API toegangsrechten — elztec-dashboard
-- Supabase wijzigt per 30 oktober 2026 het standaardgedrag: nieuwe tabellen in
-- de public schema krijgen GEEN automatische toegang meer via de Data API
-- (supabase-js / PostgREST). Dit bestand legt de rechten expliciet vast.
--
-- Uitvoeren in: Supabase Dashboard → SQL Editor
-- Project:      bbxqfaxvakwjrdkhnhug
--
-- Tabeloverzicht:
--   user_roles    → authenticated users lezen eigen rol; service_role beheert alles
--   exact_tokens  → ALLEEN service_role (geen Data API grants — interne tabel)
--   exact_cache   → ALLEEN service_role (geen Data API grants — interne tabel)

-- ── user_roles ───────────────────────────────────────────────
-- Ingelogde gebruikers mogen hun eigen rij lezen (RLS policy regelt de beperking).
-- Schrijven gaat altijd via de service_role (admin API route).
GRANT SELECT ON public.user_roles
  TO authenticated;

-- exact_tokens en exact_cache: bestaande grants intrekken + geen nieuwe toekennen.
-- Toegang uitsluitend via server-side service_role (warm-cache cron + callback route).
REVOKE ALL ON public.exact_tokens FROM anon, authenticated;
REVOKE ALL ON public.exact_cache  FROM anon, authenticated;

-- Verificatie
SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee IN ('authenticated', 'anon')
ORDER BY table_name, grantee, privilege_type;
