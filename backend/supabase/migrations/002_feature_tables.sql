-- Migration 002: Feature Tables
-- GeneratedDocuments, Subscriptions, PromotionalTokens, TokenUsage, UsageLogs, VoiceSessions

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE output_language AS ENUM ('english', 'urdu', 'sindhi');
CREATE TYPE output_format    AS ENUM ('in_app', 'pdf', 'docx');
CREATE TYPE validation_status AS ENUM ('valid', 'invalid', 'pending');
CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'cancelled');
CREATE TYPE discount_type AS ENUM ('percentage', 'fixed_amount', 'trial_extension', 'document_credit');
CREATE TYPE action_type AS ENUM ('document_generation', 'document_upload', 'api_call', 'login', 'logout');
CREATE TYPE voice_session_status AS ENUM ('recording', 'processing', 'completed', 'failed');
CREATE TYPE transcription_language AS ENUM ('english', 'urdu', 'sindhi');

-- ============================================================
-- GENERATED DOCUMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS generated_documents (
    id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    template_id         UUID NOT NULL REFERENCES templates(id) ON DELETE RESTRICT,
    domain_id           UUID NOT NULL REFERENCES domains(id) ON DELETE RESTRICT,
    input_parameters    JSONB NOT NULL DEFAULT '{}',
    retrieved_sources   JSONB NOT NULL DEFAULT '[]',
    output_content      TEXT NOT NULL,
    output_language     output_language NOT NULL DEFAULT 'english',
    output_format       output_format NOT NULL DEFAULT 'in_app',
    validation_status   validation_status NOT NULL DEFAULT 'pending',
    validation_errors   JSONB,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN generated_documents.retrieved_sources IS 'Array of {source_id, text, confidence, page} RAG sources';
COMMENT ON COLUMN generated_documents.input_parameters  IS 'User-provided values for template slots';

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS subscriptions (
    id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    tier                subscription_tier NOT NULL,
    status              subscription_status NOT NULL DEFAULT 'active',
    start_date          DATE NOT NULL,
    expiry_date         DATE NOT NULL,
    payment_reference   TEXT,
    amount_paid         NUMERIC(12, 2),
    currency            TEXT NOT NULL DEFAULT 'PKR',
    institution_id      UUID REFERENCES profiles(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- PROMOTIONAL TOKENS
-- ============================================================

CREATE TABLE IF NOT EXISTS promotional_tokens (
    id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code                  TEXT NOT NULL UNIQUE,
    discount_type         discount_type NOT NULL,
    discount_value        NUMERIC(12, 2) NOT NULL,
    max_usage_count       INTEGER NOT NULL,
    current_usage_count   INTEGER NOT NULL DEFAULT 0,
    expiry_date           DATE NOT NULL,
    domain_restriction    UUID REFERENCES domains(id),
    tier_restriction      subscription_tier,
    created_by            UUID NOT NULL REFERENCES profiles(id),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT usage_count_valid CHECK (current_usage_count <= max_usage_count)
);

CREATE TRIGGER trg_promotional_tokens_updated_at BEFORE UPDATE ON promotional_tokens FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TOKEN USAGE
-- ============================================================

CREATE TABLE IF NOT EXISTS token_usage (
    id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    token_id          UUID NOT NULL REFERENCES promotional_tokens(id) ON DELETE RESTRICT,
    user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    benefit_applied   JSONB NOT NULL DEFAULT '{}',
    redemption_date   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (token_id, user_id)
);

-- ============================================================
-- USAGE LOGS
-- ============================================================

CREATE TABLE IF NOT EXISTS usage_logs (
    id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    action_type  action_type NOT NULL,
    domain_id    UUID NOT NULL REFERENCES domains(id) ON DELETE RESTRICT,
    resource_id  UUID,
    timestamp    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    details      JSONB NOT NULL DEFAULT '{}'
);

-- ============================================================
-- VOICE SESSIONS (Phase 2 – Pilot)
-- Audio is deleted after transcription; this table stores metadata only after deletion
-- ============================================================

CREATE TABLE IF NOT EXISTS voice_sessions (
    id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id                 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    domain_id               UUID NOT NULL REFERENCES domains(id) ON DELETE RESTRICT,
    audio_file_path         TEXT,
    transcription_text      TEXT,
    transcription_language  transcription_language,
    transcription_confidence FLOAT,
    status                  voice_session_status NOT NULL DEFAULT 'recording',
    submitted_as_query      BOOLEAN NOT NULL DEFAULT false,
    resulting_query_id      UUID,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at            TIMESTAMPTZ,

    CONSTRAINT confidence_range CHECK (
        transcription_confidence IS NULL
        OR (transcription_confidence >= 0.0 AND transcription_confidence <= 1.0)
    )
);

COMMENT ON TABLE  voice_sessions IS 'Phase 2 voice sessions; audio_file_path is nulled after transcription for GDPR compliance';
COMMENT ON COLUMN voice_sessions.audio_file_path IS 'Temporary path; set to NULL within 30s of transcription completion';
