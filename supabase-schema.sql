-- Voer dit uit in de Supabase SQL Editor van het bestaande project

-- Exact Online tokens per bedrijf (één rij per divisie)
CREATE TABLE exact_tokens (
  division      INTEGER PRIMARY KEY,
  company_name  TEXT NOT NULL,
  access_token  TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Cache voor zware API-queries
CREATE TABLE exact_cache (
  id        TEXT PRIMARY KEY,
  data      JSONB NOT NULL,
  cached_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE exact_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE exact_cache  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users lezen tokens"
  ON exact_tokens FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Service role schrijft tokens"
  ON exact_tokens FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Auth users lezen cache"
  ON exact_cache FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Service role schrijft cache"
  ON exact_cache FOR ALL
  USING (auth.role() = 'service_role');
