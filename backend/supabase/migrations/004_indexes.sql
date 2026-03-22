-- Migration 004: Indexes
-- GIN indexes on JSONB columns + composite performance indexes

-- ============================================================
-- PROFILES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_profiles_email     ON profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_phone     ON profiles (phone);
CREATE INDEX IF NOT EXISTS idx_profiles_domain_id ON profiles (domain_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role      ON profiles (role);

-- ============================================================
-- DOMAINS
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_domains_name   ON domains (name);
CREATE INDEX IF NOT EXISTS idx_domains_status ON domains (status);

-- ============================================================
-- TEMPLATES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_templates_domain_id ON templates (domain_id);
CREATE INDEX IF NOT EXISTS idx_templates_is_active ON templates (is_active);
CREATE INDEX IF NOT EXISTS idx_templates_domain_active ON templates (domain_id, is_active);

-- GIN on slot_definitions for JSON queries
CREATE INDEX IF NOT EXISTS idx_templates_slot_definitions ON templates USING GIN (slot_definitions);

-- ============================================================
-- DOCUMENTS
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_documents_domain_id  ON documents (domain_id);
CREATE INDEX IF NOT EXISTS idx_documents_status     ON documents (status);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_domain_status ON documents (domain_id, status);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by   ON documents (uploaded_by);

-- GIN on metadata for JSON queries (chapter, jurisdiction, etc.)
CREATE INDEX IF NOT EXISTS idx_documents_metadata ON documents USING GIN (metadata);

-- OCR-specific
CREATE INDEX IF NOT EXISTS idx_documents_ocr_processed ON documents (ocr_processed) WHERE ocr_processed = false;
CREATE INDEX IF NOT EXISTS idx_documents_ocr_flagged   ON documents USING GIN (ocr_flagged_pages);

-- ============================================================
-- EMBEDDINGS
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_embeddings_document_id      ON embeddings (document_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_domain_namespace ON embeddings (domain_namespace);
CREATE INDEX IF NOT EXISTS idx_embeddings_language         ON embeddings (language);

-- GIN on metadata for section/page lookups
CREATE INDEX IF NOT EXISTS idx_embeddings_metadata ON embeddings USING GIN (metadata);

-- ============================================================
-- GENERATED DOCUMENTS
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_generated_docs_user_id     ON generated_documents (user_id);
CREATE INDEX IF NOT EXISTS idx_generated_docs_domain_id   ON generated_documents (domain_id);
CREATE INDEX IF NOT EXISTS idx_generated_docs_created_at  ON generated_documents (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_docs_user_domain ON generated_documents (user_id, domain_id);
CREATE INDEX IF NOT EXISTS idx_generated_docs_validation  ON generated_documents (validation_status);

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id    ON subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status     ON subscriptions (status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expiry     ON subscriptions (expiry_date);

-- ============================================================
-- PROMOTIONAL TOKENS
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_promo_tokens_code        ON promotional_tokens (code);
CREATE INDEX IF NOT EXISTS idx_promo_tokens_expiry      ON promotional_tokens (expiry_date);
CREATE INDEX IF NOT EXISTS idx_promo_tokens_domain      ON promotional_tokens (domain_restriction);

-- ============================================================
-- USAGE LOGS
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id     ON usage_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_domain_id   ON usage_logs (domain_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_action_type ON usage_logs (action_type);
CREATE INDEX IF NOT EXISTS idx_usage_logs_timestamp   ON usage_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_composite   ON usage_logs (user_id, domain_id, action_type, timestamp DESC);

-- ============================================================
-- VOICE SESSIONS
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_voice_sessions_user_id   ON voice_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_status    ON voice_sessions (status);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_created   ON voice_sessions (created_at DESC);
