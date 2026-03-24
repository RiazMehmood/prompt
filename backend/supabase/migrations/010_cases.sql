-- Migration 010: Case Files
-- Stores lawyer case files linked to extracted FIR data.
-- Each case has full FIR fields, status, and audit trail.

CREATE TABLE IF NOT EXISTS cases (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  domain_id     UUID NOT NULL REFERENCES domains(id),

  -- Derived from FIR for quick display
  case_title    TEXT NOT NULL,           -- "State vs [accused] — FIR [no]"
  fir_number    TEXT,
  fir_date      TEXT,
  police_station TEXT,
  district      TEXT,
  sections      TEXT,
  accused_name  TEXT,
  complainant_name TEXT,

  -- Full extracted FIR payload (all 21 fields)
  fir_fields    JSONB DEFAULT '{}'::jsonb NOT NULL,

  -- Uploaded file names kept for reference
  fir_file_names TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Case lifecycle
  status        TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'closed', 'archived')),
  notes         TEXT,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_cases_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cases_updated_at ON cases;
CREATE TRIGGER cases_updated_at
  BEFORE UPDATE ON cases
  FOR EACH ROW EXECUTE FUNCTION update_cases_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cases_user_id   ON cases(user_id);
CREATE INDEX IF NOT EXISTS idx_cases_domain_id ON cases(domain_id);
CREATE INDEX IF NOT EXISTS idx_cases_status    ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_created   ON cases(created_at DESC);

-- RLS
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

-- Users see only their own cases
CREATE POLICY cases_user_select ON cases FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY cases_user_insert ON cases FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY cases_user_update ON cases FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY cases_user_delete ON cases FOR DELETE
  USING (user_id = auth.uid());
