<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Elztec Dashboard — Ontwikkelaarsdocumentatie

## Database (Supabase)

**Project**: `bbxqfaxvakwjrdkhnhug`
**DDL uitvoeren**: via de Supabase CLI — project is gelinkt, voer SQL altijd zo uit:
```bash
npx supabase db query --linked << 'SQL'
-- jouw SQL hier
SQL
```
Sla migraties ook op als `.sql`-bestand in `supabase/` zodat er een history is. Nooit kopiëren/plakken via het dashboard.

### Tabeloverzicht en toegangsmodel

| Tabel | `anon` | `authenticated` | `service_role` |
|---|---|---|---|
| `user_roles` | ❌ | SELECT | ✅ alles |
| `exact_tokens` | ❌ | ❌ | ✅ alles |
| `exact_cache` | ❌ | ❌ | ✅ alles |

`exact_tokens` en `exact_cache` zijn **interne tabellen** — nooit grants verlenen aan `anon` of `authenticated`. Toegang uitsluitend via de server-side `service_role` client (`lib/supabase-server.ts`).

### ⚠️ Nieuwe tabel aanmaken — verplichte checklist

Supabase verleent vanaf **30 oktober 2026** geen automatische Data API-toegang meer aan nieuwe tabellen. Beslis per tabel bewust welke rol toegang krijgt:

```sql
-- Optie A: tabel bereikbaar via supabase-js (authenticated gebruikers)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.<tabel> TO authenticated;
ALTER TABLE public.<tabel> ENABLE ROW LEVEL SECURITY;
-- + RLS-policies toevoegen

-- Optie B: interne tabel — ALLEEN via service_role (server-side)
-- Geen GRANT nodig. Controleer dat er GEEN anon/authenticated grants zijn:
REVOKE ALL ON public.<tabel> FROM anon, authenticated;
ALTER TABLE public.<tabel> ENABLE ROW LEVEL SECURITY;
-- Geen RLS-policies nodig (service_role bypassed RLS al)
```

Zonder de juiste `GRANT` geeft PostgREST een `42501`-fout.
