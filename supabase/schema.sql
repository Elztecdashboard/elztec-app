-- Elztec Dashboard — Supabase schema
-- Project: bbxqfaxvakwjrdkhnhug
-- Run via: Supabase Dashboard → SQL Editor → New query → paste → Run

-- Exact Online OAuth tokens (één rij per Exact-divisie)
CREATE TABLE IF NOT EXISTS exact_tokens (
  division      INTEGER      PRIMARY KEY,
  access_token  TEXT         NOT NULL,
  refresh_token TEXT         NOT NULL,
  expires_at    TIMESTAMPTZ  NOT NULL,
  company_name  TEXT,
  updated_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- Cache voor zware Exact API queries (optioneel)
CREATE TABLE IF NOT EXISTS exact_cache (
  cache_key  TEXT         PRIMARY KEY,
  data       JSONB        NOT NULL,
  created_at TIMESTAMPTZ  DEFAULT NOW(),
  expires_at TIMESTAMPTZ  NOT NULL
);
