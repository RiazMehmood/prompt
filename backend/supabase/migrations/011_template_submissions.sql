-- Migration 011: Template Submissions
-- Allows users and institute_admins to submit custom templates for review.
-- Root admin or domain admin approves → template goes live in domain.

CREATE TABLE IF NOT EXISTS template_submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id       UUID NOT NULL REFERENCES domains(id),
  submitted_by    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  institute_id    UUID REFERENCES institutes(id),   -- null for individual users

  -- Template content (mirrors templates table)
  name            TEXT NOT NULL,
  description     TEXT,
  content         TEXT NOT NULL,                     -- with {{slot}} placeholders
  slot_definitions JSONB NOT NULL DEFAULT '[]',

  -- Review workflow
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by     UUID REFERENCES profiles(id),
  reviewed_at     TIMESTAMPTZ,
  review_notes    TEXT,

  -- If approved, the resulting template id
  template_id     UUID REFERENCES templates(id),

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_template_submissions_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS template_submissions_updated_at ON template_submissions;
CREATE TRIGGER template_submissions_updated_at
  BEFORE UPDATE ON template_submissions
  FOR EACH ROW EXECUTE FUNCTION update_template_submissions_updated_at();

CREATE INDEX IF NOT EXISTS idx_tpl_sub_submitted_by ON template_submissions(submitted_by);
CREATE INDEX IF NOT EXISTS idx_tpl_sub_domain        ON template_submissions(domain_id);
CREATE INDEX IF NOT EXISTS idx_tpl_sub_status        ON template_submissions(status);

-- RLS
ALTER TABLE template_submissions ENABLE ROW LEVEL SECURITY;

-- Users see their own submissions
CREATE POLICY tpl_sub_select_own ON template_submissions FOR SELECT
  USING (submitted_by = auth.uid());

-- Users can insert their own submissions
CREATE POLICY tpl_sub_insert_own ON template_submissions FOR INSERT
  WITH CHECK (submitted_by = auth.uid());

-- Admins (root_admin, domain_admin) can see all in their domain and update status
CREATE POLICY tpl_sub_admin_select ON template_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('root_admin', 'domain_admin')
        AND (p.domain_id = template_submissions.domain_id OR p.role = 'root_admin')
    )
  );

CREATE POLICY tpl_sub_admin_update ON template_submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('root_admin', 'domain_admin')
        AND (p.domain_id = template_submissions.domain_id OR p.role = 'root_admin')
    )
  );
