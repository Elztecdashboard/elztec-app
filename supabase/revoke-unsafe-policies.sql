-- Verwijder onveilige policies uit supabase-schema.sql (verouderd bestand)
-- De policies "Auth users lezen tokens" en "Auth users lezen cache" geven elke
-- ingelogde gebruiker leestoegang tot OAuth tokens — dat is niet de bedoeling.
-- Alleen service_role (server-side) mag deze tabellen benaderen.
--
-- Uitvoeren in: Supabase Dashboard → SQL Editor

DROP POLICY IF EXISTS "Auth users lezen tokens" ON public.exact_tokens;
DROP POLICY IF EXISTS "Auth users lezen cache"  ON public.exact_cache;

-- Controleer dat er geen policies meer zijn op deze tabellen (verwacht: 0 rijen)
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('exact_tokens', 'exact_cache');
