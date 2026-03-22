-- Migration 005: Institutes + Staff Permissions System
-- Adds institute management and fine-grained staff permission scopes.

-- ── Extend user_role enum ─────────────────────────────────────────────────────
-- 'staff'           — platform employee with limited scopes (set in staff_permissions)
-- 'institute_admin' — runs an institute; scoped to their institute_id
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'staff';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'institute_admin';

-- ── Institutes ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS institutes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                TEXT NOT NULL,
    domain_id           UUID NOT NULL REFERENCES domains(id) ON DELETE RESTRICT,
    contact_email       TEXT,
    contact_phone       TEXT,
    address             TEXT,
    -- Subscription / commercial
    subscription_plan   TEXT NOT NULL DEFAULT 'bulk',   -- 'bulk' | 'enterprise'
    discount_pct        INTEGER NOT NULL DEFAULT 0 CHECK (discount_pct BETWEEN 0 AND 100),
    max_users           INTEGER NOT NULL DEFAULT 50,
    -- Status
    status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  institutes IS 'Organizations (schools, firms, hospitals) purchasing bulk subscriptions';
COMMENT ON COLUMN institutes.discount_pct IS 'Discount applied to per-seat pricing vs public rate';
COMMENT ON COLUMN institutes.max_users    IS 'Maximum seats purchased by this institute';

-- ── Add institute_id to profiles ──────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS institute_id UUID REFERENCES institutes(id) ON DELETE SET NULL;

-- ── Staff Permissions ─────────────────────────────────────────────────────────
-- One row per (staff_member, permission_scope). A staff member may hold multiple scopes.
CREATE TABLE IF NOT EXISTS staff_permissions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    permission  TEXT NOT NULL,   -- see comment below
    domain_id   UUID REFERENCES domains(id) ON DELETE CASCADE,  -- NULL = all domains
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (staff_id, permission, domain_id)
);

COMMENT ON TABLE  staff_permissions IS 'Fine-grained permission scopes assigned to staff accounts by root_admin';
COMMENT ON COLUMN staff_permissions.permission IS
  'Allowed values: manage_users | manage_domain_users | approve_documents | '
  'manage_payments | manage_institutes | view_analytics | manage_subscriptions';

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_institutes_domain_id   ON institutes(domain_id);
CREATE INDEX IF NOT EXISTS idx_institutes_status      ON institutes(status);
CREATE INDEX IF NOT EXISTS idx_profiles_institute_id  ON profiles(institute_id);
CREATE INDEX IF NOT EXISTS idx_staff_permissions_staff_id ON staff_permissions(staff_id);

-- ── Updated-at triggers ───────────────────────────────────────────────────────
CREATE TRIGGER trg_institutes_updated_at
    BEFORE UPDATE ON institutes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
