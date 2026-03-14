# Data Model

**Feature**: Domain-Adaptive Multi-Tenant Agentic Platform
**Date**: 2026-03-14
**Status**: Draft

## Overview

This document defines the complete data model for the Domain-Adaptive Multi-Tenant Agentic Platform, including all entities, relationships, validation rules, and state transitions. The model is designed for PostgreSQL with pgvector extension and Row-Level Security (RLS).

---

## Core Entities

### User

Represents a registered user with flexible authentication methods.

**Table**: `users`

**Fields**:
```sql
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    email VARCHAR(255) UNIQUE,  -- Nullable for phone-only signups
    password_hash VARCHAR(255),  -- Nullable for OAuth/phone signups
    phone_number VARCHAR(20) UNIQUE,  -- Nullable for email/OAuth signups
    auth_method VARCHAR(20) NOT NULL CHECK (auth_method IN ('email', 'phone', 'google')),
    google_id VARCHAR(255) UNIQUE,  -- For OAuth users
    full_name VARCHAR(255) NOT NULL,
    role_id UUID NOT NULL REFERENCES roles(role_id),
    account_status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'blocked', 'suspended', 'deleted')),
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP,
    CONSTRAINT auth_method_fields CHECK (
        (auth_method = 'email' AND email IS NOT NULL AND password_hash IS NOT NULL) OR
        (auth_method = 'phone' AND phone_number IS NOT NULL) OR
        (auth_method = 'google' AND email IS NOT NULL AND google_id IS NOT NULL)
    )
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX idx_users_phone ON users(phone_number) WHERE phone_number IS NOT NULL;
CREATE INDEX idx_users_google ON users(google_id) WHERE google_id IS NOT NULL;
```

**Validation Rules**:
- Email format: RFC 5322 compliant
- Password: Min 8 chars, 1 uppercase, 1 number, 1 special char
- Phone: Pakistani format (+92-3XX-XXXXXXX)
- At least one of email/phone must be present
- email_verified must be TRUE for email auth_method
- phone_verified must be TRUE for phone auth_method

**RLS Policy**:
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_isolation ON users
    FOR ALL
    USING (user_id = current_setting('app.current_user_id')::uuid);
```

---

### Role

Represents a professional role configuration (dynamically created by admin).

**Table**: `roles`

**Fields**:
```sql
CREATE TABLE roles (
    role_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name VARCHAR(50) UNIQUE NOT NULL,  -- Slug: 'doctor', 'lawyer', 'teacher'
    display_name VARCHAR(100) NOT NULL,  -- 'Medical Doctor', 'Lawyer'
    category VARCHAR(50) NOT NULL,  -- 'healthcare', 'legal', 'education'
    description TEXT,
    ai_persona_prompt TEXT NOT NULL,  -- How AI should behave for this role
    sidebar_features JSONB NOT NULL DEFAULT '[]',  -- Array of feature names
    document_formatting_rules JSONB NOT NULL DEFAULT '{}',  -- Paper size, margins, etc.
    created_by UUID REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_roles_category ON roles(category);
CREATE INDEX idx_roles_active ON roles(is_active);
```

**Validation Rules**:
- role_name: Lowercase, alphanumeric + hyphen only
- category: Must be consistent across related documents
- ai_persona_prompt: Min 50 chars, max 2000 chars
- sidebar_features: Valid JSON array of strings

**Example**:
```json
{
    "role_name": "doctor",
    "display_name": "Medical Doctor",
    "category": "healthcare",
    "ai_persona_prompt": "You are a medical professional assistant with expertise in Pakistani healthcare regulations and clinical protocols.",
    "sidebar_features": ["Medical Protocols", "Pharmaceutical Guidelines", "Patient Reports"],
    "document_formatting_rules": {
        "paper_size": "A4",
        "margins": {"top": "1in", "bottom": "1in", "left": "1in", "right": "1in"}
    }
}
```

---

### Subscription Plan

Represents a subscription tier configuration for a role.

**Table**: `subscription_plans`

**Fields**:
```sql
CREATE TABLE subscription_plans (
    plan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(role_id),
    tier VARCHAR(20) NOT NULL CHECK (tier IN ('basic', 'pro', 'premium')),
    monthly_price DECIMAL(10, 2) NOT NULL CHECK (monthly_price >= 0),
    six_month_price DECIMAL(10, 2) NOT NULL CHECK (six_month_price >= 0),
    yearly_price DECIMAL(10, 2) NOT NULL CHECK (yearly_price >= 0),
    features JSONB NOT NULL DEFAULT '{}',  -- documents_limit, queries_limit, etc.
    trial_duration_days INT NOT NULL DEFAULT 14 CHECK (trial_duration_days IN (7, 14, 21, 30)),
    trial_documents_limit INT NOT NULL DEFAULT 10,
    trial_queries_limit INT NOT NULL DEFAULT 50,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(role_id, tier)
);

CREATE INDEX idx_plans_role ON subscription_plans(role_id);
CREATE INDEX idx_plans_active ON subscription_plans(is_active);
```

**Features JSON Structure**:
```json
{
    "documents_limit": 150,  -- Per month, null = unlimited
    "queries_limit": null,   -- Unlimited
    "storage_limit_mb": 500,
    "priority_support": true,
    "ai_model_tier": "pro"  -- 'basic', 'pro', 'premium'
}
```

---

### User Subscription

Represents a user's active subscription.

**Table**: `user_subscriptions`

**Fields**:
```sql
CREATE TABLE user_subscriptions (
    subscription_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id),
    role_id UUID NOT NULL REFERENCES roles(role_id),
    plan_id UUID NOT NULL REFERENCES subscription_plans(plan_id),
    tier VARCHAR(20) NOT NULL CHECK (tier IN ('basic', 'pro', 'premium')),
    billing_cycle VARCHAR(20) NOT NULL CHECK (billing_cycle IN ('monthly', 'six_month', 'yearly')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'expired', 'cancelled', 'suspended')),
    payment_method VARCHAR(20) CHECK (payment_method IN ('jazzcash', 'easypaisa', 'card')),
    auto_renew BOOLEAN DEFAULT TRUE,
    documents_used INT DEFAULT 0,
    queries_used INT DEFAULT 0,
    storage_used_mb DECIMAL(10, 2) DEFAULT 0,
    last_warning_sent TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_subscriptions_end_date ON user_subscriptions(end_date);
```

**State Transitions**:
```
trial → active (payment confirmed)
trial → expired (trial period ended, no payment)
active → expired (subscription period ended, no renewal)
active → cancelled (user cancelled)
active → suspended (payment failed after retries)
expired → active (user renewed)
cancelled → active (user resubscribed)
```

**RLS Policy**:
```sql
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY subscription_isolation ON user_subscriptions
    FOR ALL
    USING (user_id = current_setting('app.current_user_id')::uuid);
```

---

### Payment Transaction

Represents a payment record.

**Table**: `payment_transactions`

**Fields**:
```sql
CREATE TABLE payment_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id),
    subscription_id UUID REFERENCES user_subscriptions(subscription_id),
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'PKR',
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('jazzcash', 'easypaisa', 'card')),
    payment_gateway VARCHAR(20) NOT NULL CHECK (payment_gateway IN ('jazzcash', 'easypaisa', 'stripe')),
    payment_gateway_transaction_id VARCHAR(255),
    card_last_four VARCHAR(4),  -- For card payments
    card_brand VARCHAR(20),  -- 'Visa', 'Mastercard'
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    failure_reason TEXT,
    payment_date TIMESTAMP,
    gateway_response JSONB,
    retry_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_transactions_user ON payment_transactions(user_id);
CREATE INDEX idx_transactions_subscription ON payment_transactions(subscription_id);
CREATE INDEX idx_transactions_status ON payment_transactions(status);
CREATE INDEX idx_transactions_gateway_id ON payment_transactions(payment_gateway_transaction_id);
```

**RLS Policy**:
```sql
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY transaction_isolation ON payment_transactions
    FOR SELECT
    USING (user_id = current_setting('app.current_user_id')::uuid);
```

---

### Document

Represents a knowledge base document with embeddings.

**Table**: `documents`

**Fields**:
```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE documents (
    document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536),  -- text-embedding-004 dimensions
    role_id UUID NOT NULL REFERENCES roles(role_id),
    category VARCHAR(50) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',  -- type, domain_specific_attributes
    images JSONB DEFAULT '[]',  -- Array of image references with captions
    is_scanned BOOLEAN DEFAULT FALSE,
    ocr_confidence INT CHECK (ocr_confidence BETWEEN 0 AND 100),
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'needs_manual_review')),
    uploaded_by UUID REFERENCES users(user_id),
    reviewed_by UUID REFERENCES users(user_id),
    quality_score INT CHECK (quality_score BETWEEN 0 AND 100),
    is_sample_template BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    reviewed_at TIMESTAMP
);

CREATE INDEX idx_documents_role ON documents(role_id);
CREATE INDEX idx_documents_category ON documents(category);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_embedding ON documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

**Metadata JSON Structure**:
```json
{
    "type": "case_law",  -- 'act', 'case_law', 'sample', 'textbook', 'policy'
    "jurisdiction": "Pakistan",
    "court": "Supreme Court",
    "date": "2018-05-15",
    "sections": ["Section 302 PPC", "Section 497 CrPC"],
    "domain_specific": {
        "case_number": "Criminal Appeal No. 123/2018",
        "judges": ["Justice A", "Justice B"]
    }
}
```

**RLS Policy**:
```sql
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY document_role_isolation ON documents
    FOR SELECT
    USING (
        category = (
            SELECT r.category
            FROM users u
            JOIN roles r ON u.role_id = r.role_id
            WHERE u.user_id = current_setting('app.current_user_id')::uuid
        )
        AND status = 'approved'
    );
```

---

### Document Template

Represents a document type configuration for a role.

**Table**: `document_templates`

**Fields**:
```sql
CREATE TABLE document_templates (
    template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(role_id),
    template_name VARCHAR(100) NOT NULL,  -- 'planner', 'worksheet', 'bail_application'
    display_name VARCHAR(200) NOT NULL,
    template_type VARCHAR(20) NOT NULL CHECK (template_type IN ('structured', 'freeform')),
    required_fields JSONB NOT NULL DEFAULT '[]',  -- Array of field names
    output_format VARCHAR(10) NOT NULL CHECK (output_format IN ('docx', 'pdf')),
    formatting_rules JSONB NOT NULL DEFAULT '{}',
    generation_prompt TEXT NOT NULL,  -- Instructions for AI
    created_by UUID REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(role_id, template_name)
);

CREATE INDEX idx_templates_role ON document_templates(role_id);
CREATE INDEX idx_templates_active ON document_templates(is_active);
```

**Required Fields Example**:
```json
["petitioner_name", "father_name", "police_station", "fir_number", "court_name"]
```

---

### Generated Document

Represents a user-generated document.

**Table**: `generated_documents`

**Fields**:
```sql
CREATE TABLE generated_documents (
    document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id),
    role_id UUID NOT NULL REFERENCES roles(role_id),
    workflow_id UUID,  -- References workflow state
    template_id UUID REFERENCES document_templates(template_id),
    document_type VARCHAR(100) NOT NULL,
    file_path VARCHAR(500) NOT NULL,  -- S3/Spaces path
    metadata JSONB NOT NULL DEFAULT '{}',  -- domain_specific_details, citations, parameters
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_generated_docs_user ON generated_documents(user_id);
CREATE INDEX idx_generated_docs_role ON generated_documents(role_id);
CREATE INDEX idx_generated_docs_created ON generated_documents(created_at);
```

**RLS Policy**:
```sql
ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY generated_doc_isolation ON generated_documents
    FOR ALL
    USING (user_id = current_setting('app.current_user_id')::uuid);
```

---

### Chat Session

Represents a user's conversation with the AI.

**Table**: `chat_sessions`

**Fields**:
```sql
CREATE TABLE chat_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id),
    role_id UUID NOT NULL REFERENCES roles(role_id),
    messages JSONB NOT NULL DEFAULT '[]',  -- Array of message objects
    analysis_results JSONB,  -- Case analysis, recommendations, citations
    created_at TIMESTAMP DEFAULT NOW(),
    last_active TIMESTAMP DEFAULT NOW(),
    archived BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_active ON chat_sessions(last_active) WHERE NOT archived;
```

**Messages JSON Structure**:
```json
[
    {
        "role": "user",
        "content": "What are chances of bail?",
        "timestamp": "2026-03-14T10:30:00Z"
    },
    {
        "role": "assistant",
        "content": "Based on similar cases...",
        "timestamp": "2026-03-14T10:30:05Z",
        "confidence_score": 0.85,
        "ai_model_used": "gemini-1.5-pro"
    }
]
```

**RLS Policy**:
```sql
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY chat_session_isolation ON chat_sessions
    FOR ALL
    USING (user_id = current_setting('app.current_user_id')::uuid);
```

---

### Exam Question (Medical Exam Prep)

Represents MCQ questions for exam preparation.

**Table**: `exam_questions`

**Fields**:
```sql
CREATE TABLE exam_questions (
    question_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject VARCHAR(100) NOT NULL,  -- 'Pharmacology', 'Anatomy'
    topic VARCHAR(100) NOT NULL,  -- 'Cardiovascular', 'CNS'
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    question_text TEXT NOT NULL,
    options JSONB NOT NULL,  -- Array of option objects
    explanation TEXT NOT NULL,
    references TEXT,  -- Textbook citations
    source VARCHAR(50) NOT NULL CHECK (source IN ('admin_upload', 'user_contribution', 'ai_generated')),
    uploaded_by UUID REFERENCES users(user_id),
    status VARCHAR(20) NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP DEFAULT NOW(),
    approved_by UUID REFERENCES users(user_id)
);

CREATE INDEX idx_exam_questions_subject ON exam_questions(subject);
CREATE INDEX idx_exam_questions_topic ON exam_questions(topic);
CREATE INDEX idx_exam_questions_difficulty ON exam_questions(difficulty);
CREATE INDEX idx_exam_questions_status ON exam_questions(status);
```

**Options JSON Structure**:
```json
[
    {"option": "A", "text": "Increases heart rate", "is_correct": false},
    {"option": "B", "text": "Decreases heart rate", "is_correct": true},
    {"option": "C", "text": "No effect on heart rate", "is_correct": false},
    {"option": "D", "text": "Irregular heart rate", "is_correct": false}
]
```

---

### Exam Attempt

Represents a user's exam/test attempt.

**Table**: `exam_attempts`

**Fields**:
```sql
CREATE TABLE exam_attempts (
    attempt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id),
    mode VARCHAR(20) NOT NULL CHECK (mode IN ('practice', 'test', 'review')),
    subject VARCHAR(100) NOT NULL,
    questions JSONB NOT NULL,  -- Array of question_ids
    answers JSONB NOT NULL DEFAULT '{}',  -- {question_id: selected_option}
    score INT,  -- Correct answers count
    time_taken INT,  -- Seconds
    time_limit INT,  -- Seconds (for test mode)
    completed_at TIMESTAMP,
    performance_breakdown JSONB,  -- Topic-wise performance
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_exam_attempts_user ON exam_attempts(user_id);
CREATE INDEX idx_exam_attempts_subject ON exam_attempts(subject);
CREATE INDEX idx_exam_attempts_completed ON exam_attempts(completed_at);
```

**Performance Breakdown Example**:
```json
{
    "Cardiovascular": {"correct": 9, "total": 10, "percentage": 90},
    "CNS": {"correct": 6, "total": 8, "percentage": 75},
    "Antibiotics": {"correct": 4, "total": 5, "percentage": 80}
}
```

**RLS Policy**:
```sql
ALTER TABLE exam_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY exam_attempt_isolation ON exam_attempts
    FOR ALL
    USING (user_id = current_setting('app.current_user_id')::uuid);
```

---

### Query Cache

Represents cached AI responses for cost optimization.

**Table**: `query_cache`

**Fields**:
```sql
CREATE TABLE query_cache (
    cache_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_hash VARCHAR(64) UNIQUE NOT NULL,  -- SHA256 of normalized query
    role_id UUID NOT NULL REFERENCES roles(role_id),
    category VARCHAR(50) NOT NULL,
    query_text TEXT NOT NULL,
    response_text TEXT NOT NULL,
    ai_model_used VARCHAR(50) NOT NULL,
    confidence_score DECIMAL(3, 2),
    hit_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    last_accessed TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_query_cache_hash ON query_cache(query_hash);
CREATE INDEX idx_query_cache_expires ON query_cache(expires_at);
CREATE INDEX idx_query_cache_role_category ON query_cache(role_id, category);
```

---

### Audit Log

Represents all data access and modification events.

**Table**: `audit_log`

**Fields**:
```sql
CREATE TABLE audit_log (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id),
    tenant_id UUID,
    action VARCHAR(50) NOT NULL,  -- 'query', 'upload', 'approve', 'generate', etc.
    resource_id UUID,
    timestamp TIMESTAMP DEFAULT NOW(),
    ip_address INET,
    details JSONB
);

CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_tenant ON audit_log(tenant_id);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp);
CREATE INDEX idx_audit_log_action ON audit_log(action);
```

---

### Saved Payment Method

Represents user's saved payment methods.

**Table**: `saved_payment_methods`

**Fields**:
```sql
CREATE TABLE saved_payment_methods (
    payment_method_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id),
    method_type VARCHAR(20) NOT NULL CHECK (method_type IN ('card', 'jazzcash', 'easypaisa')),
    card_token VARCHAR(255),  -- Tokenized, never raw card number
    card_last_four VARCHAR(4),
    card_brand VARCHAR(20),
    card_expiry_month INT CHECK (card_expiry_month BETWEEN 1 AND 12),
    card_expiry_year INT,
    mobile_number VARCHAR(20),  -- For JazzCash/EasyPaisa
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP
);

CREATE INDEX idx_saved_payment_methods_user ON saved_payment_methods(user_id);
```

**RLS Policy**:
```sql
ALTER TABLE saved_payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY payment_method_isolation ON saved_payment_methods
    FOR ALL
    USING (user_id = current_setting('app.current_user_id')::uuid);
```

---

### Pricing History

Represents historical pricing changes.

**Table**: `pricing_history`

**Fields**:
```sql
CREATE TABLE pricing_history (
    history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(role_id),
    plan_id UUID NOT NULL REFERENCES subscription_plans(plan_id),
    tier VARCHAR(20) NOT NULL,
    old_price JSONB NOT NULL,  -- {monthly, six_month, yearly}
    new_price JSONB NOT NULL,
    old_trial_settings JSONB,  -- {duration_days, documents_limit, queries_limit}
    new_trial_settings JSONB,
    effective_date DATE NOT NULL,
    changed_by UUID NOT NULL REFERENCES users(user_id),
    reason TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_pricing_history_role ON pricing_history(role_id);
CREATE INDEX idx_pricing_history_plan ON pricing_history(plan_id);
CREATE INDEX idx_pricing_history_effective ON pricing_history(effective_date);
```

---

## Entity Relationships

```
User ──┬─── UserSubscription ─── SubscriptionPlan ─── Role
       │
       ├─── GeneratedDocument ─── DocumentTemplate ─── Role
       │
       ├─── ChatSession ─── Role
       │
       ├─── ExamAttempt ─── ExamQuestion
       │
       ├─── PaymentTransaction ─── UserSubscription
       │
       └─── SavedPaymentMethod

Role ──┬─── Document (knowledge base)
       │
       ├─── DocumentTemplate
       │
       └─── SubscriptionPlan

Document ─── Contribution (pending review)

AuditLog (references all entities)
QueryCache ─── Role
PricingHistory ─── SubscriptionPlan ─── Role
```

---

## Data Lifecycle

### User Signup Flow
1. User submits signup (email/phone/Google)
2. Verification code sent (email/SMS) or OAuth completed
3. User verifies → User record created with `account_status='active'`
4. Trial subscription created with `status='trial'`

### Subscription Flow
1. Trial expires or user upgrades → Payment initiated
2. PaymentTransaction created with `status='pending'`
3. Payment gateway webhook → Transaction `status='completed'`
4. UserSubscription updated: `status='trial'` → `status='active'`

### Document Upload Flow
1. User uploads PDF → Document created with `status='pending'`
2. AI extracts metadata, generates summary
3. Admin reviews → Document `status='approved'` or `status='rejected'`
4. If approved → Embedding generated, document becomes queryable

### Data Deletion Flow
1. User cancels subscription → `status='cancelled'`, `end_date` set
2. After 30 days → Scheduled job deletes user data
3. GeneratedDocument, ChatSession, ExamAttempt deleted
4. User record anonymized: `account_status='deleted'`, email/phone nulled

---

## Indexes & Performance

**Critical Indexes**:
- `idx_documents_embedding`: IVFFlat index for vector similarity search
- `idx_users_tenant`: Fast tenant isolation
- `idx_subscriptions_end_date`: Expiry checks
- `idx_query_cache_hash`: Fast cache lookups

**Query Optimization**:
- Use `EXPLAIN ANALYZE` for slow queries (>100ms)
- Partition `audit_log` by month for large datasets
- Archive `chat_sessions` older than 30 days

---

## Next Steps

1. Generate API contracts from this data model
2. Create Alembic migrations
3. Implement Pydantic models matching this schema
4. Write RLS policy tests
