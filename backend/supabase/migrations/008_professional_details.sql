-- Migration 008: Add professional_details JSONB to profiles
-- Stores lawyer/doctor/teacher-specific fields collected during onboarding
-- so document agent can auto-fill applicant_name, court_name, bar_number etc.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS professional_details JSONB NOT NULL DEFAULT '{}';

COMMENT ON COLUMN profiles.professional_details IS
  'Domain-specific professional info: full_name, court_name, bar_number, designation, etc.';
