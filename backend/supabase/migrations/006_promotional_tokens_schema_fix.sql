-- Migration 006: align promotional_tokens schema with token_service.py expectations
-- The original migration used different column names; this aligns them.

-- Add missing columns (safe with IF NOT EXISTS / DEFAULT values)
ALTER TABLE promotional_tokens
  ADD COLUMN IF NOT EXISTS description        TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS max_uses           INTEGER,
  ADD COLUMN IF NOT EXISTS used_count         INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_uses_per_user  INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS valid_from         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS valid_until        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS domain_id          UUID REFERENCES domains(id) ON DELETE SET NULL;

-- Backfill new columns from old columns (for any existing rows)
UPDATE promotional_tokens SET
  max_uses    = COALESCE(max_uses, max_usage_count),
  used_count  = COALESCE(used_count, current_usage_count),
  valid_from  = COALESCE(valid_from, created_at),
  valid_until = COALESCE(valid_until, expiry_date::TIMESTAMPTZ),
  domain_id   = COALESCE(domain_id, domain_restriction)
WHERE max_uses IS NULL OR valid_from IS NULL OR valid_until IS NULL;

-- Set NOT NULL after backfill
ALTER TABLE promotional_tokens
  ALTER COLUMN max_uses   SET NOT NULL,
  ALTER COLUMN valid_from SET NOT NULL,
  ALTER COLUMN valid_until SET NOT NULL;

-- Make original legacy columns optional (code now uses the new columns above)
ALTER TABLE promotional_tokens
  ALTER COLUMN max_usage_count     DROP NOT NULL,
  ALTER COLUMN current_usage_count DROP NOT NULL,
  ALTER COLUMN expiry_date         DROP NOT NULL,
  ALTER COLUMN created_by          DROP NOT NULL;

ALTER TABLE promotional_tokens
  ALTER COLUMN max_usage_count     SET DEFAULT 0,
  ALTER COLUMN current_usage_count SET DEFAULT 0;
