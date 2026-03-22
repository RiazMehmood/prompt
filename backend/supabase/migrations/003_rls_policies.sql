-- Migration 003: Row Level Security Policies
-- User isolation, domain isolation, admin overrides

-- ============================================================
-- HELPER FUNCTION: get current user's role from profiles
-- ============================================================

CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS user_role
LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT role FROM profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION auth_user_domain_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT domain_id FROM profiles WHERE id = auth.uid()
$$;

-- ============================================================
-- DOMAINS
-- ============================================================

ALTER TABLE domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "domains_read_active" ON domains
    FOR SELECT USING (status = 'active');

CREATE POLICY "domains_admin_all" ON domains
    FOR ALL TO authenticated
    USING (auth_user_role() = 'root_admin');

-- ============================================================
-- PROFILES
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_read_own" ON profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "profiles_root_admin_all" ON profiles
    FOR ALL TO authenticated
    USING (auth_user_role() = 'root_admin');

-- ============================================================
-- TEMPLATES
-- ============================================================

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "templates_read_own_domain" ON templates
    FOR SELECT TO authenticated
    USING (domain_id = auth_user_domain_id() AND is_active = true);

CREATE POLICY "templates_admin_manage" ON templates
    FOR ALL TO authenticated
    USING (
        auth_user_role() = 'root_admin'
        OR (auth_user_role() = 'domain_admin' AND domain_id = auth_user_domain_id())
    );

-- ============================================================
-- DOCUMENTS
-- ============================================================

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documents_read_own_domain_approved" ON documents
    FOR SELECT TO authenticated
    USING (domain_id = auth_user_domain_id() AND status = 'approved');

CREATE POLICY "documents_upload_own_domain" ON documents
    FOR INSERT TO authenticated
    WITH CHECK (domain_id = auth_user_domain_id() AND uploaded_by = auth.uid());

CREATE POLICY "documents_domain_admin_all" ON documents
    FOR ALL TO authenticated
    USING (
        auth_user_role() = 'root_admin'
        OR (auth_user_role() = 'domain_admin' AND domain_id = auth_user_domain_id())
    );

-- ============================================================
-- EMBEDDINGS (accessed via service role only in RAG queries)
-- ============================================================

ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "embeddings_read_own_domain" ON embeddings
    FOR SELECT TO authenticated
    USING (domain_namespace = (SELECT knowledge_base_namespace FROM domains WHERE id = auth_user_domain_id()));

-- ============================================================
-- GENERATED DOCUMENTS
-- ============================================================

ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "generated_docs_read_own" ON generated_documents
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "generated_docs_insert_own" ON generated_documents
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "generated_docs_admin_all" ON generated_documents
    FOR ALL TO authenticated
    USING (auth_user_role() IN ('domain_admin', 'root_admin'));

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_read_own" ON subscriptions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "subscriptions_admin_all" ON subscriptions
    FOR ALL TO authenticated
    USING (auth_user_role() = 'root_admin');

-- ============================================================
-- PROMOTIONAL TOKENS
-- ============================================================

ALTER TABLE promotional_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "promotional_tokens_read_all" ON promotional_tokens
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "promotional_tokens_admin_manage" ON promotional_tokens
    FOR ALL TO authenticated
    USING (auth_user_role() = 'root_admin');

-- ============================================================
-- TOKEN USAGE
-- ============================================================

ALTER TABLE token_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "token_usage_read_own" ON token_usage
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "token_usage_insert_own" ON token_usage
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================================
-- USAGE LOGS
-- ============================================================

ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usage_logs_read_own" ON usage_logs
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "usage_logs_insert_own" ON usage_logs
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "usage_logs_admin_all" ON usage_logs
    FOR ALL TO authenticated
    USING (auth_user_role() IN ('domain_admin', 'root_admin'));

-- ============================================================
-- VOICE SESSIONS
-- ============================================================

ALTER TABLE voice_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "voice_sessions_own" ON voice_sessions
    FOR ALL USING (user_id = auth.uid());
