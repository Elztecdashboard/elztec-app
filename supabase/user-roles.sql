-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role    TEXT NOT NULL CHECK (role IN ('admin', 'lezer')),
  naam    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Users can read their own role
CREATE POLICY "Gebruiker leest eigen rol"
  ON user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can do everything
CREATE POLICY "Service role beheert alles"
  ON user_roles FOR ALL
  USING (auth.role() = 'service_role');
