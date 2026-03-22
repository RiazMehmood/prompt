-- Migration 001: Core Tables
-- Users, Domains, Templates, Documents, Embeddings
-- Run in Supabase SQL Editor or via supabase CLI

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE subscription_tier AS ENUM ('basic', 'pro', 'premium', 'institutional');
CREATE TYPE user_role AS ENUM ('user', 'domain_admin', 'root_admin');
CREATE TYPE domain_status AS ENUM ('active', 'inactive');
CREATE TYPE document_type AS ENUM ('act', 'case_law', 'sample', 'textbook', 'protocol', 'standard');
CREATE TYPE document_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE language_enum AS ENUM ('english', 'urdu', 'sindhi', 'mixed');

-- ============================================================
-- DOMAINS
-- Must be created before users (users FK to domains)
-- ============================================================

CREATE TABLE IF NOT EXISTS domains (
    id                        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name                      TEXT NOT NULL UNIQUE,
    description               TEXT,
    icon_url                  TEXT,
    status                    domain_status NOT NULL DEFAULT 'active',
    configuration             JSONB NOT NULL DEFAULT '{}',
    knowledge_base_namespace  TEXT NOT NULL UNIQUE,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  domains IS 'Professional domains (Legal, Education, Medical, etc.)';
COMMENT ON COLUMN domains.knowledge_base_namespace IS 'ChromaDB collection name — unique per domain for vector isolation';

-- ============================================================
-- USERS (extends Supabase auth.users)
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
    id                          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email                       TEXT UNIQUE,
    phone                       TEXT UNIQUE,
    password_hash               TEXT NOT NULL DEFAULT '',
    verification_code           TEXT,
    verification_expires        TIMESTAMPTZ,
    domain_id                   UUID REFERENCES domains(id),
    subscription_tier           subscription_tier NOT NULL DEFAULT 'basic',
    subscription_start_date     TIMESTAMPTZ,
    subscription_expiry_date    TIMESTAMPTZ,
    document_generation_count   INTEGER NOT NULL DEFAULT 0,
    upload_count                INTEGER NOT NULL DEFAULT 0,
    role                        user_role NOT NULL DEFAULT 'user',
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at               TIMESTAMPTZ,

    CONSTRAINT email_or_phone CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

COMMENT ON TABLE  profiles IS 'User profiles extending Supabase auth.users; domain_id is immutable after first assignment';
COMMENT ON COLUMN profiles.domain_id IS 'Immutable after first assignment — enforced at application level';

-- ============================================================
-- TEMPLATES
-- ============================================================

CREATE TABLE IF NOT EXISTS templates (
    id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name                TEXT NOT NULL,
    domain_id           UUID NOT NULL REFERENCES domains(id) ON DELETE RESTRICT,
    description         TEXT,
    content             TEXT NOT NULL,
    slot_definitions    JSONB NOT NULL DEFAULT '[]',
    formatting_rules    JSONB NOT NULL DEFAULT '{}',
    version             TEXT NOT NULL DEFAULT '1.0.0',
    is_active           BOOLEAN NOT NULL DEFAULT true,
    created_by          UUID REFERENCES profiles(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (domain_id, name, version)
);

COMMENT ON COLUMN templates.slot_definitions IS 'Array of {name, type, required, data_source} slot objects';
COMMENT ON COLUMN templates.content          IS 'Template text with {{slot_name}} placeholders';

-- ============================================================
-- DOCUMENTS (Knowledge Base)
-- ============================================================

CREATE TABLE IF NOT EXISTS documents (
    id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    filename             TEXT NOT NULL,
    file_path            TEXT NOT NULL,
    file_size_bytes      INTEGER NOT NULL,
    mime_type            TEXT NOT NULL,
    domain_id            UUID NOT NULL REFERENCES domains(id) ON DELETE RESTRICT,
    document_type        document_type NOT NULL,
    metadata             JSONB NOT NULL DEFAULT '{}',
    status               document_status NOT NULL DEFAULT 'pending',
    approval_notes       TEXT,
    uploaded_by          UUID NOT NULL REFERENCES profiles(id),
    approved_by          UUID REFERENCES profiles(id),
    approved_at          TIMESTAMPTZ,
    -- OCR fields (added for image-based PDFs)
    ocr_processed        BOOLEAN NOT NULL DEFAULT false,
    ocr_confidence_avg   FLOAT,
    ocr_flagged_pages    JSONB,
    detected_language    language_enum,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN documents.ocr_processed      IS 'Set to true after OCR pipeline completes';
COMMENT ON COLUMN documents.ocr_confidence_avg IS 'Average OCR confidence across all image pages (0.0–1.0)';
COMMENT ON COLUMN documents.ocr_flagged_pages  IS 'Array of {page_num, confidence, reason} for pages below threshold';

-- ============================================================
-- EMBEDDINGS
-- ============================================================

CREATE TABLE IF NOT EXISTS embeddings (
    id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id      UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_text       TEXT NOT NULL,
    chunk_index      INTEGER NOT NULL,
    embedding_vector FLOAT[] NOT NULL,
    metadata         JSONB NOT NULL DEFAULT '{}',
    domain_namespace TEXT NOT NULL,
    language         language_enum NOT NULL DEFAULT 'english',
    is_ocr_derived   BOOLEAN NOT NULL DEFAULT false,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT embedding_vector_dim CHECK (array_length(embedding_vector, 1) = 768)
);

COMMENT ON COLUMN embeddings.embedding_vector IS '768-dim vector from multilingual-e5-base';
COMMENT ON COLUMN embeddings.domain_namespace IS 'Matches domains.knowledge_base_namespace for isolation';
COMMENT ON COLUMN embeddings.is_ocr_derived   IS 'True if chunk was extracted via OCR from an image page';

-- ============================================================
-- Updated_at auto-triggers
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_domains_updated_at   BEFORE UPDATE ON domains   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_profiles_updated_at  BEFORE UPDATE ON profiles  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_templates_updated_at BEFORE UPDATE ON templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
