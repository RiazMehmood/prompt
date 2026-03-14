# Tasks: Domain-Adaptive Multi-Tenant Agentic Platform

**Input**: Design documents from `/specs/001-domain-adaptive-platform/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Not explicitly requested in the feature specification. Test tasks are omitted. Add them separately if TDD approach is desired.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story. Mobile app tasks are integrated alongside web tasks where applicable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US0, US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/src/`, `backend/tests/`
- **Frontend Web**: `frontend/src/`
- **Frontend Mobile**: `mobile/`
- **Infrastructure**: `infrastructure/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependency management, and basic project scaffolding

- [ ] T001 Create project directory structure matching plan.md layout (`backend/`, `frontend/`, `mobile/`, `infrastructure/`)
- [ ] T002 [P] Initialize Python backend project with pyproject.toml and requirements.txt (FastAPI 0.109+, LangChain 0.1+, Supabase, Stripe, google-auth, alembic, asyncpg, redis, httpx, python-jose, passlib, python-docx, pydantic 2.x)
- [ ] T003 [P] Initialize Next.js 14 frontend project with package.json (React 18, TanStack Query, Zustand, Tailwind CSS, shadcn/ui) in `frontend/`
- [ ] T004 [P] Initialize Expo mobile project with package.json (Expo SDK 50+, React Native 0.73+, React Navigation 6+, NativeWind, Expo SecureStore, React Native Paper) in `mobile/`
- [ ] T005 [P] Create backend Dockerfile in `infrastructure/docker/backend.Dockerfile`
- [ ] T006 [P] Create frontend Dockerfile in `infrastructure/docker/frontend.Dockerfile`
- [ ] T007 Create docker-compose.yml at repository root with services: backend, frontend, postgres (15+ with pgvector), redis (7+)
- [ ] T008 [P] Create backend environment configuration module in `backend/src/config.py` with all env vars from quickstart.md (DATABASE_URL, REDIS_URL, JWT keys, AI keys, payment keys, OAuth, SMTP, Slack, Spaces, CORS)
- [ ] T009 [P] Create frontend environment configuration with `.env.local.example` and `frontend/src/lib/utils.ts`
- [ ] T010 [P] Create mobile environment configuration with `mobile/.env.example` and `mobile/app.json` (Expo config with app name, slug, version, iOS/Android settings)
- [ ] T011 [P] Configure backend linting (ruff) and formatting (black) with `pyproject.toml` settings
- [ ] T012 [P] Configure frontend linting (ESLint) and formatting (Prettier) with `frontend/.eslintrc.json` and `frontend/.prettierrc`
- [ ] T013 [P] Configure mobile linting (ESLint) and formatting (Prettier) with `mobile/.eslintrc.json` and `mobile/.prettierrc`
- [ ] T014 [P] Create shared TypeScript types package structure in `mobile/types/` and `frontend/src/types/` with symlink or npm workspace for code sharing
- [ ] T015 [P] Setup Expo Application Services (EAS) configuration in `mobile/eas.json` for iOS and Android builds

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database & ORM Foundation

- [ ] T016 Initialize Alembic migrations framework in `backend/src/db/migrations/` with async PostgreSQL driver
- [ ] T017 Create database session management module in `backend/src/db/session.py` with async session factory, connection pooling, and tenant context injection (`SET app.current_user_id`, `SET app.current_tenant_id`)
- [ ] T018 [P] Create Role model (Pydantic + SQLAlchemy) in `backend/src/models/role.py` with fields: role_id, role_name, display_name, category, description, ai_persona_prompt, sidebar_features (JSONB), document_formatting_rules (JSONB), created_by, created_at, is_active
- [ ] T019 [P] Create User model (Pydantic + SQLAlchemy) in `backend/src/models/user.py` with fields: user_id, tenant_id, email (nullable), password_hash (nullable), phone_number (nullable), auth_method, google_id (nullable), full_name, role_id (FK→roles), account_status, email_verified, phone_verified, created_at, last_login; include auth_method_fields CHECK constraint
- [ ] T020 [P] Create AuditLog model (Pydantic + SQLAlchemy) in `backend/src/models/audit.py` with fields: log_id, user_id, tenant_id, action, resource_id, timestamp, ip_address, details (JSONB)
- [ ] T021 Create initial Alembic migration for Role, User, and AuditLog tables including all indexes from data-model.md in `backend/src/db/migrations/versions/`
- [ ] T022 Create Row-Level Security (RLS) policies SQL file in `backend/src/db/rls_policies.sql` for users, user_subscriptions, payment_transactions, documents, generated_documents, chat_sessions, exam_attempts, saved_payment_methods tables
- [ ] T023 Create database seed script in `backend/scripts/seed_data.py` with initial roles (lawyer, teacher, doctor, engineer, officer), sample subscription plans, and admin user

### API Framework & Middleware

- [ ] T024 Create FastAPI application entry point in `backend/src/main.py` with CORS, health check endpoint (`/health`), API v1 router mounting, lifespan handlers for DB/Redis connections
- [ ] T025 [P] Create JWT authentication middleware in `backend/src/api/middleware.py` with token validation, rate limiting per user/tier, CORS configuration, and request logging
- [ ] T026 [P] Create FastAPI dependencies module in `backend/src/api/dependencies.py` with `get_db` (async session), `get_current_user` (JWT decode + user lookup), `get_admin_user` (admin role check), `set_tenant_context` (RLS setup)
- [ ] T027 [P] Create shared Pydantic response/error schemas in `backend/src/models/common.py` with Error schema, pagination models, and standard response wrappers

### Frontend Framework Foundation

- [ ] T028 Create Next.js 14 App Router layout in `frontend/src/app/layout.tsx` with providers (TanStack Query, Zustand)
- [ ] T029 [P] Create API client module in `frontend/src/lib/api-client.ts` with typed fetch wrapper, JWT token injection, refresh token logic, and error handling
- [ ] T030 [P] Create auth helper module in `frontend/src/lib/auth.ts` with token storage, user session management, and protected route wrapper
- [ ] T031 [P] Create Zustand auth store in `frontend/src/stores/authStore.ts` with user state, login/logout actions, token management
- [ ] T032 [P] Create TypeScript API types in `frontend/src/types/api.ts` matching Pydantic schemas (User, Role, Error, SubscriptionPlan, UserSubscription, etc.)
- [ ] T033 [P] Setup shadcn/ui component library with base components (Button, Input, Card, Dialog, Select, Toast, Badge) in `frontend/src/components/ui/`

### Mobile Framework Foundation

- [ ] T034 Create Expo Router root layout in `mobile/app/_layout.tsx` with providers (TanStack Query, Zustand)
- [ ] T035 [P] Create shared API client module in `mobile/lib/api-client.ts` (reuse web logic with React Native fetch)
- [ ] T036 [P] Create shared auth helper module in `mobile/lib/auth.ts` with Expo SecureStore for token storage
- [ ] T037 [P] Create shared Zustand auth store in `mobile/stores/authStore.ts` (same logic as web)
- [ ] T038 [P] Create shared TypeScript API types in `mobile/types/api.ts` (symlink or copy from web)
- [ ] T039 [P] Setup React Native Paper component library with theme configuration in `mobile/lib/theme.ts`
- [ ] T040 [P] Create biometric authentication helper in `mobile/lib/biometric.ts` using Expo LocalAuthentication for Face ID/Touch ID/Fingerprint

### Redis & Cache Infrastructure

- [ ] T041 Create Redis connection manager in `backend/src/db/redis.py` with async connection pool, health check, and key namespace utilities

**Checkpoint**: Foundation ready — user story implementation can now begin in parallel

---

## Phase 3: User Story 0 — User Signs Up with Choice of Authentication Method (Priority: P1) 🎯 MVP

**Goal**: Enable user signup via Email/Password, Phone OTP, or Google OAuth with verification and automatic trial activation

**Independent Test**: Sign up with each method (email, phone, Google), verify codes work, test invalid formats, check duplicate prevention, verify trial activation

### Backend Implementation for US0

- [ ] T042 [P] [US0] Create email authentication service in `backend/src/services/auth/email_auth.py` with signup (send 6-digit code, 10-min expiry), verify (check code, create account), login (email+password), resend code (60s cooldown), and 3-attempt lockout (15 min)
- [ ] T043 [P] [US0] Create phone OTP authentication service in `backend/src/services/auth/phone_auth.py` with signup (send SMS OTP, 5-min expiry), verify (check OTP, create account), login (phone+OTP), resend OTP (60s cooldown), and Pakistani format validation (+92-3XX-XXXXXXX)
- [ ] T044 [P] [US0] Create Google OAuth authentication service in `backend/src/services/auth/oauth.py` with signup (verify Google ID token, extract email/name, prompt role selection), login, and token refresh
- [ ] T045 [US0] Create auth API router in `backend/src/api/v1/auth.py` with endpoints: POST `/auth/signup/email`, POST `/auth/signup/phone`, POST `/auth/signup/google`, POST `/auth/verify/email`, POST `/auth/verify/phone`, POST `/auth/login`, POST `/auth/refresh`, POST `/auth/resend-code`, GET `/auth/me`, POST `/auth/link-phone` per contracts/auth.yaml
- [ ] T046 [US0] Create SubscriptionPlan model in `backend/src/models/subscription.py` with plan_id, role_id, tier, monthly_price, six_month_price, yearly_price, features (JSONB), trial_duration_days, trial_documents_limit, trial_queries_limit, is_active
- [ ] T047 [US0] Create UserSubscription model in `backend/src/models/subscription.py` (same file) with subscription_id, user_id, role_id, plan_id, tier, billing_cycle, start_date, end_date, status, payment_method, auto_renew, documents_used, queries_used, storage_used_mb, last_warning_sent
- [ ] T048 [US0] Create trial activation service in `backend/src/services/subscriptions/trial.py` that auto-activates trial subscription after successful verification/OAuth, using role-specific trial settings (duration, limits)
- [ ] T049 [US0] Create Alembic migration for SubscriptionPlan and UserSubscription tables with indexes and RLS policies in `backend/src/db/migrations/versions/`
- [ ] T050 [US0] Implement unverified account cleanup scheduled job in `backend/src/services/auth/cleanup.py` to delete accounts not verified within 24 hours

### Frontend Implementation for US0

- [ ] T051 [P] [US0] Create EmailSignup component in `frontend/src/components/auth/EmailSignup.tsx` with email, password (strength indicator), name, role selection form
- [ ] T052 [P] [US0] Create PhoneSignup component in `frontend/src/components/auth/PhoneSignup.tsx` with phone number input (Pakistani format mask), name, role selection form
- [ ] T053 [P] [US0] Create GoogleOAuth component in `frontend/src/components/auth/GoogleOAuth.tsx` with Google sign-in button, OAuth flow, and role selection prompt
- [ ] T054 [US0] Create signup page in `frontend/src/app/(auth)/signup/page.tsx` with three authentication option buttons and routing to appropriate form
- [ ] T055 [US0] Create verification page in `frontend/src/app/(auth)/verify/page.tsx` with 6-digit code input, resend button (60s cooldown), and error handling for max attempts
- [ ] T056 [US0] Create login page in `frontend/src/app/(auth)/login/page.tsx` with email/phone/Google login options
- [ ] T057 [US0] Create useAuth hook in `frontend/src/hooks/useAuth.ts` with signup, verify, login, logout, refreshToken mutations using TanStack Query
- [ ] T058 [US0] Create dashboard layout with welcome message in `frontend/src/app/(dashboard)/layout.tsx` including sidebar (role-specific features), header (user info), and trial status banner

### Mobile Implementation for US0

- [ ] T059 [P] [US0] Create EmailSignup screen in `mobile/components/auth/EmailSignup.tsx` with email, password, name, role selection form using React Native Paper
- [ ] T060 [P] [US0] Create PhoneSignup screen in `mobile/components/auth/PhoneSignup.tsx` with phone input (Pakistani format), name, role selection
- [ ] T061 [P] [US0] Create GoogleOAuth component in `mobile/components/auth/GoogleOAuth.tsx` using Expo AuthSession for OAuth flow
- [ ] T062 [US0] Create signup screen in `mobile/app/(auth)/signup.tsx` with three authentication option buttons
- [ ] T063 [US0] Create verification screen in `mobile/app/(auth)/verify.tsx` with 6-digit code input, resend button, error handling
- [ ] T064 [US0] Create login screen in `mobile/app/(auth)/login.tsx` with email/phone/Google options and biometric authentication toggle
- [ ] T065 [US0] Create shared useAuth hook in `mobile/hooks/useAuth.ts` (reuse web logic with Expo SecureStore for tokens)
- [ ] T066 [US0] Create tab navigation layout in `mobile/app/(tabs)/_layout.tsx` with bottom tabs (Home, Chat, Documents, Subscription) and trial status banner
- [ ] T067 [US0] Implement biometric authentication flow in `mobile/lib/biometric.ts` with Face ID/Touch ID/Fingerprint support after initial login
- [ ] T068 [US0] Implement auth method uniqueness enforcement in `backend/src/models/user.py` (enhance) with CHECK constraint ensuring only one auth_method per user, and validate in auth API endpoints to prevent linking additional auth methods after signup

**Checkpoint**: US0 complete — users can sign up, verify, login on web and mobile, see trial status. Independently testable.

---

## Phase 4: User Story 1 — Lawyer Analyzes Case Strategy and Generates Bail Application (Priority: P1) 🎯 MVP

**Goal**: Enable AI-powered case analysis with RAG, follow-up questions, and document generation with Pakistani court formatting

**Independent Test**: Describe a case scenario, receive AI strategy analysis with citations, ask follow-ups, generate bail application document

### Backend — RAG & AI Infrastructure for US1

- [ ] T069 [P] [US1] Create AI provider abstraction interface in `backend/src/services/ai/provider.py` with abstract `generate()`, `health_check()`, and `stream()` methods, plus model tier mapping (Basic→Flash/mini, Pro→mixed, Premium→Pro/4o)
- [ ] T070 [P] [US1] Create Gemini provider implementation in `backend/src/services/ai/gemini.py` with Gemini 1.5 Flash and Pro model support, streaming, error handling
- [ ] T071 [P] [US1] Create OpenAI provider implementation in `backend/src/services/ai/openai.py` with GPT-4o and GPT-4o-mini model support, streaming, error handling
- [ ] T072 [US1] Create AI failover manager in `backend/src/services/ai/failover.py` with automatic failover from Gemini→OpenAI on timeout/rate-limit/5xx, <3s switch time, and event logging
- [ ] T073 [US1] Create AI model router in `backend/src/services/ai/router.py` with complexity analysis heuristics (word count, terminology density, multi-hop indicators) and tier-based model selection
- [ ] T074 [P] [US1] Create document chunking service in `backend/src/services/rag/chunking.py` with RecursiveCharacterTextSplitter (512 tokens, 50 overlap), metadata preservation per chunk
- [ ] T075 [P] [US1] Create embedding service in `backend/src/services/rag/embeddings.py` with text-embedding-004 model (1536 dimensions), batch embedding support
- [ ] T076 [US1] Create RAG retrieval service in `backend/src/services/rag/retrieval.py` with pgvector cosine similarity search, role-based category filtering, confidence threshold (0.75), and top-k results with source citations
- [ ] T077 [US1] Create query cache service in `backend/src/services/rag/cache.py` with Redis-based caching, query normalization (lowercase, strip, standardize), SHA256 key generation, 7-day TTL, hit count tracking, and cache invalidation on document approval

### Backend — Document & Chat Models for US1

- [ ] T078 [P] [US1] Create Document model (knowledge base) in `backend/src/models/document.py` with fields from data-model.md: document_id, title, content, embedding (vector 1536), role_id, category, metadata (JSONB), images (JSONB), is_scanned, ocr_confidence, status, uploaded_by, reviewed_by, quality_score, is_sample_template, created_at, reviewed_at
- [ ] T079 [P] [US1] Create DocumentTemplate model in `backend/src/models/document.py` (same file) with template_id, role_id, template_name, display_name, template_type, required_fields (JSONB), output_format, formatting_rules (JSONB), generation_prompt, created_by, is_active
- [ ] T080 [P] [US1] Create GeneratedDocument model in `backend/src/models/document.py` (same file) with document_id, user_id, role_id, workflow_id, template_id, document_type, file_path, metadata (JSONB), created_at
- [ ] T081 [P] [US1] Create ChatSession model in `backend/src/models/chat.py` with session_id, user_id, role_id, messages (JSONB array), analysis_results (JSONB), created_at, last_active, archived
- [ ] T082 [P] [US1] Create QueryCache model in `backend/src/models/audit.py` (append) with cache_id, query_hash, role_id, category, query_text, response_text, ai_model_used, confidence_score, hit_count, created_at, last_accessed, expires_at
- [ ] T083 [US1] Create Alembic migration for Document, DocumentTemplate, GeneratedDocument, ChatSession, QueryCache tables with pgvector extension, IVFFlat index, and all indexes from data-model.md in `backend/src/db/migrations/versions/`

### Backend — Chat & Document Generation Services for US1

- [ ] T084 [US1] Create chat service in `backend/src/services/chat.py` with create_session, send_message (RAG query + AI response with role persona injection + confidence score + citations), get_history, context maintenance across 10+ turns
- [ ] T085 [US1] Create document generation workflow using LangGraph in `backend/src/services/workflows/document_gen.py` with nodes: validate_template → collect_fields → query_rag_for_context → generate_content → format_document → save_to_storage; state persistence for resume
- [ ] T086 [US1] Create case analysis workflow in `backend/src/services/workflows/case_analysis.py` with nodes: parse_scenario → search_precedents → calculate_probability → generate_strategy → recommend_next_steps; multi-hop reasoning across documents
- [ ] T087 [US1] Create .docx document formatter in `backend/src/services/document_formatter.py` using python-docx with domain-specific formatting rules (Legal: 8.5"x14", Education: A4, Healthcare: PMC standards) loaded from role.document_formatting_rules
- [ ] T088 [US1] Create file storage service in `backend/src/services/storage.py` with DigitalOcean Spaces (S3-compatible) upload/download/delete and CDN URL generation

### Backend — API Endpoints for US1

- [ ] T089 [US1] Create RAG query API router in `backend/src/api/v1/rag.py` with endpoints: POST `/rag/query` (one-off RAG query with cache check), POST `/chat/sessions` (create session), POST `/chat/sessions/{id}/messages` (send message with streaming), GET `/chat/sessions` (list sessions), GET `/chat/sessions/{id}` (get session history) per contracts/rag.yaml
- [ ] T090 [US1] Create documents API router in `backend/src/api/v1/documents.py` with endpoints: GET `/documents/templates` (role-filtered), POST `/documents/generate` (start workflow), GET `/documents/generated/{id}/status` (poll status), GET `/documents/generated/{id}/download` (download .docx/.pdf), GET `/documents/generated` (list user's documents), POST `/documents/upload` (upload knowledge base doc, status=pending) per contracts/documents.yaml

### Frontend Implementation for US1

- [ ] T091 [P] [US1] Create ChatInterface component in `frontend/src/components/chat/ChatInterface.tsx` with message input, streaming response display, source citations panel, and confidence score indicator
- [ ] T092 [P] [US1] Create MessageList component in `frontend/src/components/chat/MessageList.tsx` with user/assistant message bubbles, timestamps, and markdown rendering
- [ ] T093 [P] [US1] Create InputBox component in `frontend/src/components/chat/InputBox.tsx` with text input, send button, and document generation trigger
- [ ] T094 [US1] Create chat page in `frontend/src/app/(dashboard)/chat/page.tsx` with session list sidebar and active chat panel
- [ ] T095 [US1] Create useChat hook in `frontend/src/hooks/useChat.ts` with create session, send message (streaming), load history mutations using TanStack Query
- [ ] T096 [US1] Create documents list page in `frontend/src/app/(dashboard)/documents/page.tsx` with generated documents table, download buttons, and status indicators
- [ ] T097 [US1] Create useDocuments hook in `frontend/src/hooks/useDocuments.ts` with generate, poll status, download, list mutations
- [ ] T098 [US1] Create Zustand chat store in `frontend/src/stores/chatStore.ts` with active session, messages, streaming state management

**Checkpoint**: US0 + US1 complete — full signup flow, AI chat with RAG, case analysis, and document generation. Core MVP functional and testable.

---

## Phase 5: User Story 2 — User Subscribes to Premium Plan with Payment Gateway (Priority: P1) 🎯 MVP

**Goal**: Enable subscription management with tiered pricing, payment via JazzCash/EasyPaisa/Card, webhook confirmation, and usage tracking

**Independent Test**: Complete free trial, select a plan, make payment via test gateway, verify subscription activation, confirm usage limits

### Backend Implementation for US2

- [ ] T099 [P] [US2] Create PaymentTransaction model in `backend/src/models/subscription.py` (append) with transaction_id, user_id, subscription_id, amount, currency, payment_method, payment_gateway, payment_gateway_transaction_id, card_last_four, card_brand, status, failure_reason, gateway_response (JSONB), retry_count, created_at
- [ ] T100 [P] [US2] Create SavedPaymentMethod model in `backend/src/models/subscription.py` (append) with payment_method_id, user_id, method_type, card_token, card_last_four, card_brand, card_expiry_month, card_expiry_year, mobile_number, is_default, created_at, last_used_at
- [ ] T101 [US2] Create Alembic migration for PaymentTransaction and SavedPaymentMethod tables with indexes and RLS policies in `backend/src/db/migrations/versions/`
- [ ] T102 [P] [US2] Create Stripe payment provider in `backend/src/services/payments/stripe.py` with create_checkout_session, verify_webhook (signature validation), handle_payment_intent_succeeded, handle_subscription_updated, tokenize_card
- [ ] T103 [P] [US2] Create JazzCash payment provider in `backend/src/services/payments/jazzcash.py` with create_payment (mobile wallet REST API), verify_webhook (HMAC signature), poll_status (30s interval, 10 min timeout)
- [ ] T104 [P] [US2] Create EasyPaisa payment provider in `backend/src/services/payments/easypaisa.py` with create_payment (REST API), verify_webhook (HMAC signature), poll_status (30s interval, 10 min timeout)
- [ ] T105 [US2] Create subscription service in `backend/src/services/subscriptions/subscription_service.py` with get_plans (role-filtered), subscribe (initiate payment), activate_subscription (webhook handler), cancel (end-of-cycle access), renew, check_usage_limits, enforce_limits (block at 100%), warn_at_80_percent, handle_auto_renewal
- [ ] T106 [US2] Create payment retry service in `backend/src/services/payments/retry.py` with 3 retry attempts over 7 days, email reminders on failure, account suspension after failed retries
- [ ] T107 [US2] Create subscriptions API router in `backend/src/api/v1/subscriptions.py` with endpoints: GET `/subscriptions/plans` (role-filtered), GET `/subscriptions/current`, POST `/subscriptions/start-trial`, POST `/subscriptions/subscribe`, POST `/subscriptions/cancel`, POST `/subscriptions/renew`, GET `/subscriptions/usage`, POST `/payments/webhook/stripe`, POST `/payments/webhook/jazzcash`, POST `/payments/webhook/easypaisa` per contracts/subscriptions.yaml

### Frontend Implementation for US2

- [ ] T108 [P] [US2] Create PricingTable component in `frontend/src/components/subscription/PricingTable.tsx` with 3-tier display (Basic/Pro/Premium), billing cycle toggle (Monthly/6-Month/Yearly), feature comparison, and role-specific pricing
- [ ] T109 [P] [US2] Create PaymentForm component in `frontend/src/components/subscription/PaymentForm.tsx` with payment method selection (JazzCash, EasyPaisa, Card), card details form with real-time validation, and secure form handling
- [ ] T110 [P] [US2] Create UsageIndicator component in `frontend/src/components/subscription/UsageIndicator.tsx` with progress bars for documents used, queries used, storage used, and 80% warning threshold
- [ ] T111 [US2] Create subscription management page in `frontend/src/app/(dashboard)/subscription/page.tsx` with current plan display, usage stats, upgrade/cancel buttons, and payment history
- [ ] T112 [US2] Create useSubscription hook in `frontend/src/hooks/useSubscription.ts` with get plans, subscribe, cancel, renew, get usage mutations
- [ ] T113 [US2] Create trial expiry banner component in `frontend/src/components/subscription/TrialBanner.tsx` with countdown, usage percentage, and upgrade CTA

### Mobile Implementation for US2

- [ ] T114 [P] [US2] Create PricingTable component in `mobile/components/subscription/PricingTable.tsx` with 3-tier cards, billing cycle toggle, feature comparison
- [ ] T115 [P] [US2] Create PaymentForm component in `mobile/components/subscription/PaymentForm.tsx` with payment method selection and deep linking support for JazzCash/EasyPaisa mobile apps
- [ ] T116 [P] [US2] Create UsageIndicator component in `mobile/components/subscription/UsageIndicator.tsx` with progress bars and 80% warning
- [ ] T117 [US2] Create subscription screen in `mobile/app/(tabs)/subscription.tsx` with current plan, usage stats, upgrade/cancel buttons
- [ ] T118 [US2] Create shared useSubscription hook in `mobile/hooks/useSubscription.ts` (reuse web logic)
- [ ] T119 [US2] Implement deep linking handler in `mobile/app/_layout.tsx` for payment gateway redirects (jazzcash://, easypaisa://) with automatic subscription activation

**Checkpoint**: US0 + US1 + US2 complete — full MVP with auth, AI chat, document generation, and payment/subscription on web and mobile. Revenue-generating platform.

---

## Phase 6: User Story 10 — User Interacts via Chat Interface (Priority: P2)

**Goal**: Provide a polished chat interface with conversation history persistence, context awareness, and session management

**Independent Test**: Open chat, ask multiple questions, verify context maintained, confirm history persists across sessions

### Implementation for US10

- [ ] T120 [US10] Enhance chat service in `backend/src/services/chat.py` to support: session archiving after 30 days, session listing with auto-generated titles from first message, message count tracking, and last_active timestamp updates
- [ ] T121 [US10] Add chat history pagination to RAG API router in `backend/src/api/v1/rag.py` with limit/offset parameters for session listing and message retrieval
- [ ] T122 [US10] Create main dashboard page in `frontend/src/app/(dashboard)/page.tsx` with prominent chat interface, recent sessions sidebar, and role-specific welcome content
- [ ] T123 [US10] Enhance ChatInterface component in `frontend/src/components/chat/ChatInterface.tsx` with session selector dropdown, new session button, session history panel with search, and archived sessions view
- [ ] T124 [US10] Create home screen in `mobile/app/(tabs)/index.tsx` with chat interface, recent sessions list, and role-specific welcome
- [ ] T125 [US10] Enhance mobile ChatInterface component in `mobile/components/chat/ChatInterface.tsx` with session management, pull-to-refresh, and offline message queue

**Checkpoint**: US10 complete — polished chat experience with persistent history and session management on web and mobile

---

## Phase 7: User Story 8 — User Receives Subscription Expiry Warnings and Data Preservation (Priority: P2)

**Goal**: Implement subscription lifecycle notifications (30d/7d/expiry warnings), usage warnings at 80%, data preservation after expiry, and seamless renewal

**Independent Test**: Create subscription near expiry, verify warnings at 30/7 days, confirm 80% usage warnings, test post-expiry blocked access, verify data preserved after renewal

### Implementation for US8

- [ ] T126 [P] [US8] Create email notification service in `backend/src/services/notifications/email.py` with SMTP integration, templated emails for: subscription expiry warnings (30d/7d/expiry), usage limit warnings (80%), payment confirmations, payment failure alerts
- [ ] T127 [P] [US8] Create Slack webhook notification service in `backend/src/services/notifications/slack.py` with structured message sending for critical/warning/info severity alerts
- [ ] T128 [US8] Create subscription lifecycle scheduler in `backend/src/services/subscriptions/lifecycle.py` with daily cron job to: check expiring subscriptions (30d/7d/today), send warnings, expire trials, suspend failed payments, enforce data retention (delete after 30 days), anonymize user records
- [ ] T129 [US8] Create usage enforcement middleware in `backend/src/api/middleware.py` (append) to check subscription status and usage limits on document generation and RAG query endpoints, returning 402/403 with appropriate messages
- [ ] T130 [US8] Add subscription status banners to dashboard layout in `frontend/src/app/(dashboard)/layout.tsx` — trial countdown, expiry warnings (30d/7d), expired state with renew CTA, and 80% usage notifications
- [ ] T131 [US8] Add subscription status banners to mobile tab layout in `mobile/app/(tabs)/_layout.tsx` with push notification integration for expiry warnings
- [ ] T132 [US8] Implement push notification service in `mobile/lib/notifications.ts` using Expo Notifications for subscription expiry, document completion, and admin announcements

**Checkpoint**: US8 complete — full subscription lifecycle with warnings, enforcement, and renewal on web and mobile

---

## Phase 8: User Story 3 — Admin Creates New Professional Role (Priority: P2)

**Goal**: Enable admins to dynamically create professional roles with custom AI persona, sidebar features, documents, and subscription pricing without code changes

**Independent Test**: Admin creates a new role (e.g., "accountant"), uploads documents, assigns to test user, verify user sees only role-specific content

### Backend Implementation for US3

- [ ] T133 [US3] Create role management service in `backend/src/services/admin/role_service.py` with create_role (validate required fields), update_role, deactivate_role, list_roles, upload_initial_documents (batch), configure_subscription_plans (Basic/Pro/Premium per role)
- [ ] T134 [US3] Create document template management service in `backend/src/services/admin/template_service.py` with create_template, update_template, list_templates (by role), validate template config (required_fields, formatting_rules, generation_prompt)
- [ ] T135 [US3] Create admin API router in `backend/src/api/v1/admin.py` with role management endpoints: POST `/admin/roles`, GET `/admin/roles`, PATCH `/admin/roles/{id}`, DELETE `/admin/roles/{id}/deactivate`, POST `/admin/roles/{id}/documents` (batch upload), POST `/admin/roles/{id}/plans` (create subscription plans), GET/POST/PATCH `/admin/templates` per contracts/admin.yaml

### Frontend Implementation for US3

- [ ] T136 [P] [US3] Create RoleManager component in `frontend/src/components/admin/RoleManager.tsx` with role creation form (name, display_name, category, AI persona textarea, sidebar features array editor, document formatting rules JSON editor)
- [ ] T137 [P] [US3] Create admin layout in `frontend/src/app/(admin)/layout.tsx` with admin-specific sidebar navigation (Users, Roles, Documents, Pricing, Analytics)
- [ ] T138 [US3] Create role management page in `frontend/src/app/(admin)/roles/page.tsx` with roles list table, create/edit forms, document upload area, and subscription plan configuration

### Mobile Implementation Decision for US3

- [ ] T139 [US3] Document mobile-web parity decision for admin features in spec.md: Clarify whether admin features (US3-Role Management, US5-HITL Review, US7-Pricing, US11-User Management) are intentionally web-only or require mobile implementations. If web-only, document rationale (e.g., "Admin features require desktop workflows with complex forms, file uploads, and data tables"). If mobile required, add ~15 mobile admin tasks.

**Checkpoint**: US3 complete — admins can create unlimited roles dynamically, platform scales to new professions

---

## Phase 9: User Story 5 — Admin Reviews and Approves User-Contributed Document (Priority: P2)

**Goal**: Implement HITL document review workflow with AI-generated metadata/summaries, admin approval/rejection, and automatic embedding on approval

**Independent Test**: Upload sample document, verify pending status, approve as admin, confirm document becomes searchable via RAG

### Implementation for US5

- [ ] T140 [US5] Create document review service in `backend/src/services/admin/document_review.py` with: process_uploaded_document (AI metadata extraction, summary generation, quality scoring), list_pending (admin view), approve_document (trigger embedding + indexing), reject_document (with mandatory reason), handle optimistic locking for concurrent admin reviews
- [ ] T141 [US5] Add document review endpoints to admin API router in `backend/src/api/v1/admin.py`: GET `/admin/documents/pending` (list pending with AI summaries), POST `/admin/documents/{id}/review` (approve/reject), GET `/admin/documents/stats` (review queue stats)
- [ ] T142 [US5] Create embedding pipeline service in `backend/src/services/rag/embedding_pipeline.py` that triggers on document approval: chunk document → generate embeddings → insert into pgvector → invalidate related query cache entries
- [ ] T143 [P] [US5] Create DocumentReview component in `frontend/src/components/admin/DocumentReview.tsx` with pending queue list, AI summary display, quality score badge, approve/reject buttons with reason modal
- [ ] T144 [US5] Create document review page in `frontend/src/app/(admin)/documents/page.tsx` with pending queue view, filters (role, category, date), and bulk actions

**Checkpoint**: US5 complete — HITL document review workflow operational, knowledge base quality maintained

**Checkpoint**: US5 complete — HITL review workflow protects knowledge base quality

---

## Phase 10: User Story 11 — Admin Manages Users and Views Analytics (Priority: P2)

**Goal**: Provide admin user management (view, block, unblock) and platform-wide analytics dashboard

**Independent Test**: Create test users, view user list as admin, block a user, verify blocked user cannot log in, view analytics dashboard

### Implementation for US11

- [ ] T145 [US11] Create user management service in `backend/src/services/admin/user_service.py` with list_users (paginated, filterable by role/status), get_user_details (with usage stats), block_user (set status='blocked'), unblock_user (set status='active'), get_platform_analytics (total users by role, documents by month, storage, API calls, revenue)
- [ ] T146 [US11] Add user management and analytics endpoints to admin API router in `backend/src/api/v1/admin.py`: GET `/admin/users` (paginated list), GET `/admin/users/{id}`, POST `/admin/users/{id}/block`, POST `/admin/users/{id}/unblock`, GET `/admin/analytics` (platform metrics) per contracts/admin.yaml
- [ ] T147 [US11] Add blocked user check to authentication flow in `backend/src/services/auth/email_auth.py`, `phone_auth.py`, `oauth.py` — return "Your account has been blocked" on login attempt
- [ ] T148 [P] [US11] Create admin users page in `frontend/src/app/(admin)/users/page.tsx` with user table (email, role, documents_generated, queries_made, storage_used, status), block/unblock buttons, search/filter
- [ ] T149 [P] [US11] Create admin analytics page in `frontend/src/app/(admin)/analytics/page.tsx` with dashboard cards (total users, active subscriptions, revenue), charts (users by role, documents by month), and real-time metrics

**Checkpoint**: US11 complete — admin governance and platform monitoring operational

---

## Phase 11: User Story 4 — Doctor Subscribes to Exam Prep Add-On and Practices MCQs (Priority: P2)

**Goal**: Implement Medical Exam Prep premium add-on with MCQ question banks, timed tests, practice/review modes, and performance analytics

**Independent Test**: Subscribe to exam prep add-on, take timed MCQ test, review answers with explanations, view performance analytics

### Backend Implementation for US4

- [ ] T150 [P] [US4] Create ExamQuestion model in `backend/src/models/exam.py` with question_id, subject, topic, difficulty, question_text, options (JSONB array), explanation, references, source, uploaded_by, status, approved_by, created_at
- [ ] T151 [P] [US4] Create ExamAttempt model in `backend/src/models/exam.py` (same file) with attempt_id, user_id, mode, subject, questions (JSONB), answers (JSONB), score, time_taken, time_limit, completed_at, performance_breakdown (JSONB), created_at
- [ ] T152 [US4] Create Alembic migration for ExamQuestion and ExamAttempt tables with indexes in `backend/src/db/migrations/versions/`
- [ ] T153 [US4] Create exam prep service in `backend/src/services/exam/exam_service.py` with: list_subjects, list_topics, start_practice (untimed, immediate feedback), start_test (timed, no answers until submit), submit_answers (score calculation, performance breakdown by topic), get_attempt_results (with explanations), get_analytics (score trends, weak areas, questions attempted over time), bookmark_question
- [ ] T154 [US4] Create exam test workflow in `backend/src/services/workflows/exam_test.py` with LangGraph nodes: select_questions → start_timer → collect_answers → score → generate_breakdown → save_attempt
- [ ] T155 [US4] Create exam prep API router in `backend/src/api/v1/exam_prep.py` with endpoints: GET `/exam-prep/subjects`, GET `/exam-prep/subjects/{id}/topics`, POST `/exam-prep/practice`, POST `/exam-prep/test`, POST `/exam-prep/attempts/{id}/submit`, GET `/exam-prep/attempts/{id}`, GET `/exam-prep/analytics`, POST `/exam-prep/questions/contribute`, GET `/exam-prep/bookmarks` per contracts/exam_prep.yaml
- [ ] T156 [US4] Create exam prep add-on subscription logic in `backend/src/services/subscriptions/subscription_service.py` (append) — add-on purchase, separate billing, access control (402 if not purchased), feature gating by role

### Frontend Implementation for US4

- [ ] T157 [P] [US4] Create exam prep layout in `frontend/src/app/(dashboard)/exam-prep/page.tsx` with subject grid, topic browser, and mode selection (Practice/Test/Review)
- [ ] T158 [P] [US4] Create MCQ question component in `frontend/src/components/exam/QuestionCard.tsx` with question text, 4 options, selection state, and immediate/delayed feedback display
- [ ] T159 [US4] Create timed test page in `frontend/src/app/(dashboard)/exam-prep/test/page.tsx` with countdown timer, question navigation, auto-submit on timeout, and navigation prevention
- [ ] T160 [US4] Create test results page in `frontend/src/app/(dashboard)/exam-prep/results/page.tsx` with score display, performance breakdown by topic (bar chart), incorrect answers with explanations, and bookmark buttons
- [ ] T161 [US4] Create analytics page in `frontend/src/app/(dashboard)/exam-prep/analytics/page.tsx` with score trend chart, weak areas identification, topic mastery indicators, and total questions attempted

### Mobile Implementation for US4

- [ ] T162 [P] [US4] Create exam prep screen in `mobile/app/(tabs)/exam-prep.tsx` with subject grid, topic browser, mode selection
- [ ] T163 [P] [US4] Create MCQ question component in `mobile/components/exam/QuestionCard.tsx` with touch-optimized option selection
- [ ] T164 [US4] Create timed test screen in `mobile/app/exam-prep/test.tsx` with countdown timer, swipe navigation, auto-submit
- [ ] T165 [US4] Create test results screen in `mobile/app/exam-prep/results.tsx` with score display, performance breakdown, explanations
- [ ] T166 [US4] Create analytics screen in `mobile/app/exam-prep/analytics.tsx` with score trends, weak areas, topic mastery

**Checkpoint**: US4 complete — exam prep module fully functional as premium add-on on web and mobile

---

## Phase 12: User Story 6 — Teacher Creates Multiple Document Types from Textbook (Priority: P3)

**Goal**: Enable teachers to generate multiple document types (MCQs, worksheets, planners, rubrics, test papers) from textbook content with role-specific formatting

**Independent Test**: Create teacher account, upload sample textbook, request multiple document types, verify each output is properly formatted

### Implementation for US6

- [ ] T167 [US6] Create template-based document generation in `backend/src/services/workflows/document_gen.py` (enhance) to support multiple document types per role — MCQs, worksheets, lesson planners, rubrics, test papers, question papers; each type uses role-specific templates from document_templates table
- [ ] T168 [US6] Seed teacher-specific document templates in `backend/scripts/seed_data.py` (enhance): planner (lesson plan template), worksheet (practice problems), rubric (grading criteria), mcq (multiple choice questions), test_paper (formal exam format), question_paper (board-style format) with Punjab Board A4 formatting
- [ ] T169 [US6] Add document type selection to ChatInterface — when AI detects document request, display available templates for user's role with descriptions in `frontend/src/components/chat/ChatInterface.tsx` (enhance)
- [ ] T170 [US6] Create document preview component in `frontend/src/components/documents/DocumentPreview.tsx` with metadata display, download options (docx/pdf), and generation status tracking
- [ ] T171 [US6] Add document type selection to mobile ChatInterface in `mobile/components/chat/ChatInterface.tsx` (enhance) with bottom sheet template selector
- [ ] T172 [US6] Create document preview component in `mobile/components/documents/DocumentPreview.tsx` with native share sheet integration

**Checkpoint**: US6 complete — teachers can generate diverse document types on web and mobile

---

## Phase 13: User Story 14 — Town Officer Resolves Complex Policy Query (Priority: P3)

**Goal**: Enable complex policy query resolution with multi-document reasoning, exact section citations, and "what-if" follow-up analysis

**Independent Test**: Create town officer account, ask complex policy question, verify AI provides exact section citations, confirm follow-ups maintain context

### Implementation for US14

- [ ] T173 [US14] Enhance RAG retrieval service in `backend/src/services/rag/retrieval.py` (enhance) with multi-hop reasoning: chain-of-thought prompting across 3+ document sources, section/clause citation extraction, and "what-if" scenario branching while maintaining conversation context
- [ ] T174 [US14] Seed officer-specific role data in `backend/scripts/seed_data.py` (enhance) — role: "officer" with category "government", AI persona for administrative/policy guidance, sidebar features: ["Service Rules", "ACR Management", "Policy Guidance"]
- [ ] T175 [US14] Enhance ChatInterface to display section citations with expandable full-text view in `frontend/src/components/chat/ChatInterface.tsx` (enhance) — when AI cites a section, user can click to see full source text
- [ ] T176 [US14] Enhance mobile ChatInterface to display section citations with expandable view in `mobile/components/chat/ChatInterface.tsx` (enhance)

**Checkpoint**: US14 complete — officers can resolve complex policy queries with precise citations on web and mobile

---

## Phase 14: User Story 7 — Admin Adjusts Subscription Pricing in Real-Time (Priority: P3)

**Goal**: Enable admin to dynamically adjust subscription pricing per role, configure free trial settings, and track pricing history

**Independent Test**: Admin changes pricing, verify new signups see updated prices, check existing user renewal pricing, confirm trial limit changes

### Backend Implementation for US7

- [ ] T177 [P] [US7] Create PricingHistory model in `backend/src/models/subscription.py` (append) with history_id, role_id, plan_id, tier, old_price (JSONB), new_price (JSONB), old_trial_settings (JSONB), new_trial_settings (JSONB), effective_date, changed_by, reason, created_at
- [ ] T178 [US7] Create Alembic migration for PricingHistory table with indexes in `backend/src/db/migrations/versions/`
- [ ] T179 [US7] Create pricing management service in `backend/src/services/admin/pricing_service.py` with update_pricing (validate positive numbers, log history, apply immediately or scheduled), update_trial_settings (new signups only, preserve existing trials), get_pricing_history (filterable by role/date)
- [ ] T180 [US7] Add pricing management endpoints to admin API router in `backend/src/api/v1/admin.py` (append): PATCH `/admin/plans/{id}/pricing`, PATCH `/admin/plans/{id}/trial`, GET `/admin/pricing/history`

### Frontend Implementation for US7

- [ ] T181 [P] [US7] Create PricingEditor component in `frontend/src/components/admin/PricingEditor.tsx` with editable pricing table (3 tiers × 3 billing cycles per role), trial settings form (duration, document limit, query limit), validation, and pricing history timeline
- [ ] T182 [US7] Create pricing management page in `frontend/src/app/(admin)/pricing/page.tsx` with role selector, pricing editor, trial configuration, and history view

**Checkpoint**: US7 complete — admins have full pricing control without developer intervention

---

## Phase 15: User Story 15 — Executive Engineer Handles Project Delay with AI Guidance (Priority: P4)

**Goal**: Enable engineers to receive situation-specific AI guidance with policy citations and batch document generation

**Independent Test**: Create engineer account, describe project delay, receive AI recommendations with citations, generate required documents

### Implementation for US15

- [ ] T183 [US15] Seed engineer-specific role data in `backend/scripts/seed_data.py` (enhance) — role: "engineer" with category "engineering", AI persona for NHA/engineering policy guidance, sidebar features: ["Project Management", "NHA Forms", "Delay Reports"], document templates: time_extension, completion_certificate, delay_justification
- [ ] T184 [US15] Enhance document generation workflow in `backend/src/services/workflows/document_gen.py` (enhance) to support batch document generation — when AI recommends multiple documents, collect fields once and generate all in a single workflow

**Checkpoint**: US15 complete — engineers can get policy guidance and batch-generate documents

---

## Phase 16: User Story 16 — Teacher Uploads Scanned Textbook with OCR (Priority: P4)

**Goal**: Enable OCR/Vision AI processing of scanned/image-based PDFs with text and image extraction

**Independent Test**: Upload scanned PDF, verify text extraction with 90%+ accuracy, query extracted content, generate documents with images

### Implementation for US16

- [ ] T185 [US16] Create OCR/Vision processing service in `backend/src/services/rag/ocr.py` with: detect_pdf_type (text vs image-based), process_scanned_pdf (Vision AI for text extraction, 90%+ accuracy target), extract_images (identify and store diagrams/images separately with captions), store image references in document.images JSONB
- [ ] T186 [US16] Enhance document upload endpoint in `backend/src/api/v1/documents.py` (enhance) to detect PDF type and route to appropriate processor (text parser vs OCR), track ocr_confidence score
- [ ] T187 [US16] Enhance document generation to include images — when generating documents from scanned sources, embed extracted diagrams/images in output .docx in `backend/src/services/document_formatter.py` (enhance)
- [ ] T188 [US16] Add camera document scanning to mobile app in `mobile/components/documents/CameraScanner.tsx` using Expo Camera with OCR processing
- [ ] T189 [US16] Create document upload screen in `mobile/app/documents/upload.tsx` with camera capture and gallery selection options

**Checkpoint**: US16 complete — platform handles real-world scanned documents from Pakistan on web and mobile

---

## Phase 17: User Story 12 — User Switches Roles (DEPRECATED — Single Role Model) (Priority: P4)

**NOTE**: User Story 12 is DEPRECATED per spec.md. Users select ONE role during signup and cannot switch. No tasks generated. The single-role model is already enforced by the User model's single `role_id` field.

---

## Phase 18: User Story 13 — Magistrate Researches Legal Provisions (Priority: P5)

**Goal**: Support magistrate users within the legal domain with judicial-perspective queries

**Independent Test**: Create magistrate account, query legal provisions, verify only legal documents retrieved, upload judicial order

### Implementation for US13

- [ ] T190 [US13] Seed magistrate-specific role data in `backend/scripts/seed_data.py` (enhance) — role: "magistrate" with category "legal" (shares document pool with lawyers), AI persona for judicial perspective, sidebar features: ["Case Law", "Procedural Rules", "Judicial Orders"]
- [ ] T191 [US13] Verify role-based RAG filtering works for magistrate (same category as lawyer) — ensure shared legal document access with judicial-specific AI persona in existing chat service

**Checkpoint**: US13 complete — magistrates can research legal provisions with judicial-specific AI

---

## Phase 19: User Story 9 — Doctor Generates Medical Report (Priority: P6)

**Goal**: Enable doctors to generate medical reports following Pakistan Medical Commission standards

**Independent Test**: Create doctor account, request medical report, provide patient details, verify PMC-formatted output

### Implementation for US9

- [ ] T192 [US9] Seed doctor-specific document templates in `backend/scripts/seed_data.py` (enhance) — templates: medical_report (patient info, diagnosis, prescription, PMC format), clinical_summary, prescription_note with healthcare formatting rules (A4, PMC margins, medical terminology)
- [ ] T193 [US9] Verify end-to-end doctor workflow — doctor role with healthcare category, medical report template, AI persona with medical expertise, PMC-formatted .docx output in existing document generation workflow

**Checkpoint**: US9 complete — doctors can generate medical reports per PMC standards

---

## Phase 20: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and system-wide quality

### Admin Alerting & Monitoring

- [ ] T194 [P] Create admin alerting service in `backend/src/services/notifications/alert_service.py` with AlertSeverity (critical/warning/info), configurable thresholds, email + Slack dispatch for: payment failures (>3 consecutive), AI API outages, RLS violations, error rate >5%, login spikes
- [ ] T195 [P] Add cost monitoring dashboard to admin analytics in `backend/src/services/admin/cost_monitor.py` with AI API costs per provider, storage costs, bandwidth tracking, and 80% budget alerting ($200/month target)
- [ ] T196 [P] Implement performance monitoring dashboard in `backend/src/services/admin/performance_monitor.py` with metrics tracking for: API response time (p50/p95/p99, target <500ms p95), RAG query latency (target <5s), cache hit rate (target 40%), AI failover events (<3s switch time), and alerting for threshold violations

### Rate Limiting & Security

- [ ] T197 [P] Implement per-user rate limiting in `backend/src/api/middleware.py` (enhance) based on subscription tier (Basic: lower limits, Premium: higher limits), with Redis-based sliding window counter
- [ ] T198 [P] Implement concurrent login detection in `backend/src/services/auth/session_guard.py` to flag simultaneous logins from different IPs with warning message per FR-066
- [ ] T199 [P] Create audit logging middleware in `backend/src/api/middleware.py` (enhance) to automatically log all data access with tenant_id, user_id, action, resource_id, timestamp, ip_address to audit_log table

### Performance & Optimization

- [ ] T200 [P] Implement response streaming for AI responses in `backend/src/api/v1/rag.py` (enhance) using Server-Sent Events (SSE) for long AI responses per FR-078
- [ ] T201 [P] Implement lazy loading for chat history and document lists in frontend pages in `frontend/src/app/(dashboard)/chat/page.tsx` and `frontend/src/app/(dashboard)/documents/page.tsx` with infinite scroll
- [ ] T202 [P] Implement lazy loading for mobile chat and documents in `mobile/app/(tabs)/chat.tsx` and `mobile/app/(tabs)/documents.tsx` with pull-to-refresh
- [ ] T203 [P] Implement query batching service in `backend/src/services/rag/batch.py` to detect and batch similar queries from multiple users within 1-hour window per FR-079
- [ ] T204 [P] Add database connection pooling configuration in `backend/src/db/session.py` (enhance) with pool size optimization for concurrent requests

### Infrastructure & Deployment

- [ ] T205 [P] Create Kubernetes deployment manifest in `infrastructure/kubernetes/deployment.yaml` for backend (3 min replicas, 10 max, 500m CPU / 1Gi memory requests)
- [ ] T206 [P] Create Kubernetes service and HPA manifests in `infrastructure/kubernetes/service.yaml` and `infrastructure/kubernetes/hpa.yaml` with CPU 70% / memory 80% scale-up triggers
- [ ] T207 [P] Create Kubernetes ConfigMap and Secrets in `infrastructure/kubernetes/configmap.yaml` and `infrastructure/kubernetes/secrets.yaml` for environment configuration
- [ ] T208 [P] Create Terraform configuration for DigitalOcean infrastructure in `infrastructure/terraform/main.tf`, `kubernetes.tf`, `database.tf`, `redis.tf`, `spaces.tf`
- [ ] T209 Create health check endpoints and readiness/liveness probes in `backend/src/main.py` (enhance) with DB connectivity, Redis connectivity, and AI provider availability checks
- [ ] T210 [P] Configure Expo EAS build profiles in `mobile/eas.json` for development, preview, and production builds for iOS and Android
- [ ] T211 [P] Create mobile app store assets and metadata in `mobile/assets/` for App Store and Google Play submissions

### Data Management

- [ ] T212 Create data retention cleanup job in `backend/src/services/subscriptions/data_retention.py` with scheduled daily execution: find cancelled subscriptions >30 days, delete user data (GeneratedDocument, ChatSession, ExamAttempt), anonymize user record (null email/phone, status='deleted') per research.md
- [ ] T213 Implement document storage compression using gzip for text content in `backend/src/services/storage.py` (enhance) and CDN configuration for DigitalOcean Spaces

### Frontend Polish

- [ ] T214 [P] Implement responsive mobile web design across all pages in `frontend/src/app/` with Tailwind CSS breakpoints for Chrome, Safari, Firefox mobile browsers
- [ ] T215 [P] Add error boundary and global error handling in `frontend/src/app/error.tsx` and `frontend/src/lib/api-client.ts` (enhance) with user-friendly error messages and retry options
- [ ] T216 [P] Add error boundary and global error handling in `mobile/app/_layout.tsx` and `mobile/lib/api-client.ts` (enhance) with user-friendly error messages
- [ ] T217 [P] Implement offline mode indicator and queue in `mobile/lib/offline.ts` with automatic sync when network restored
- [ ] T218 [P] Add dark mode support to mobile app in `mobile/lib/theme.ts` based on device system preferences
- [ ] T219 Run quickstart.md validation — verify all setup steps, API endpoints, and workflows described in quickstart.md work end-to-end for web and mobile

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — **BLOCKS all user stories**
- **US0 (Phase 3)**: Depends on Foundational — Authentication foundation
- **US1 (Phase 4)**: Depends on Foundational — Can start in parallel with US0 (models only), but API endpoints need auth from US0
- **US2 (Phase 5)**: Depends on US0 (needs user auth) — Can start backend in parallel with US1
- **US10 (Phase 6)**: Depends on US1 (chat infrastructure)
- **US8 (Phase 7)**: Depends on US2 (subscription infrastructure)
- **US3 (Phase 8)**: Depends on Foundational — Can start in parallel with US0/US1/US2
- **US5 (Phase 9)**: Depends on US1 (RAG infrastructure) + US3 (role management)
- **US11 (Phase 10)**: Depends on US3 (admin infrastructure)
- **US4 (Phase 11)**: Depends on US2 (payment) + US3 (admin role setup)
- **US6 (Phase 12)**: Depends on US1 (document generation)
- **US14 (Phase 13)**: Depends on US1 (RAG + chat)
- **US7 (Phase 14)**: Depends on US2 (subscription) + US3 (admin)
- **US15 (Phase 15)**: Depends on US1 (document generation)
- **US16 (Phase 16)**: Depends on US1 (RAG + document processing)
- **US13 (Phase 18)**: Depends on US1 (RAG)
- **US9 (Phase 19)**: Depends on US1 (document generation)
- **Polish (Phase 20)**: Depends on all desired user stories being complete

### User Story Dependencies

| Story | Depends On | Can Parallel With |
|-------|-----------|-------------------|
| US0 (Auth) | Foundational | US3 (backend only) |
| US1 (RAG+Docs) | Foundational | US2, US3 (backend models) |
| US2 (Payments) | US0 | US1, US3 |
| US10 (Chat Polish) | US1 | US8, US3 |
| US8 (Subscription Lifecycle) | US2 | US3, US5 |
| US3 (Role Management) | Foundational | US0, US1, US2 |
| US5 (HITL Review) | US1, US3 | US11 |
| US11 (User Mgmt) | US3 | US5, US4 |
| US4 (Exam Prep) | US2, US3 | US6, US7 |
| US6 (Multi-Doc Types) | US1 | US14, US7 |
| US14 (Policy Queries) | US1 | US6, US15 |
| US7 (Dynamic Pricing) | US2, US3 | US6, US4 |
| US15 (Engineer Guidance) | US1 | US16, US13 |
| US16 (OCR/Vision) | US1 | US15, US13 |
| US13 (Magistrate) | US1 | US15, US16 |
| US9 (Doctor Report) | US1 | US13 |

### Within Each User Story

- Models before services
- Services before API endpoints
- Backend API before frontend integration
- Core implementation before edge case handling
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational completes: US0, US1, US3 can start in parallel
- Backend model creation [P] tasks within a story can run in parallel
- Frontend component creation [P] tasks within a story can run in parallel
- Mobile component creation [P] tasks within a story can run in parallel
- Web and mobile frontend tasks for the same story can run in parallel (shared backend API)
- Different user stories can be worked on by different team members simultaneously

---

## Parallel Example: Phase 2 (Foundational)

All [P] marked tasks in Phase 2 can run in parallel. Example parallelizable tasks include:
- Database models (T018, T019, T020)
- API middleware and dependencies (T025, T026, T027)
- Frontend foundation (T028-T033)
- Mobile foundation (T034-T040)

## Parallel Example: Phase 3 (US0 — Auth)

All [P] marked tasks in Phase 3 can run in parallel. Example parallelizable tasks include:
- Backend auth services (T042, T043, T044)
- Frontend auth components (T051, T052, T053)
- Mobile auth components (T059, T060, T061)

---

## Implementation Strategy

### MVP First (US0 + US1 + US2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: US0 (Authentication) — users can sign up
4. Complete Phase 4: US1 (RAG + Document Generation) — core value proposition
5. Complete Phase 5: US2 (Payments + Subscriptions) — revenue generation
6. **STOP and VALIDATE**: Test all three stories independently
7. Deploy MVP — revenue-generating platform with core AI features

### Incremental Delivery

1. **MVP (Phases 1-5)**: Auth + AI Chat + Document Gen + Payments → Deploy
2. **V1.1 (Phases 6-7)**: Chat Polish + Subscription Lifecycle → Deploy
3. **V1.2 (Phases 8-10)**: Admin Dashboard (Roles + HITL + User Mgmt) → Deploy
4. **V1.3 (Phase 11)**: Exam Prep Add-On → Deploy
5. **V1.4 (Phases 12-16)**: Additional Roles + Document Types + OCR → Deploy
6. **V2.0 (Phase 20)**: Polish, Performance, Infrastructure → Deploy

### Parallel Team Strategy

With 3+ developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - **Developer A**: US0 (Auth) → US2 (Payments) → US8 (Lifecycle) → US7 (Pricing)
   - **Developer B**: US1 (RAG/Docs) → US10 (Chat) → US6 (Multi-Docs) → US16 (OCR)
   - **Developer C**: US3 (Roles) → US5 (HITL) → US11 (User Mgmt) → US4 (Exam Prep)
   - **Developer D (Mobile)**: Mobile implementations for US0 → US1 → US2 → US10 → US4 (parallel to web)
3. Stories complete and integrate independently
4. Polish phase as full team

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- US12 (Role Switching) is DEPRECATED — single-role-per-user model enforced
- Total tasks: 216 (including web and mobile app tasks)
- Total infrastructure target: $200/month for 1000 active users
- AI failover: Gemini primary → OpenAI backup, <3s switch time
- Mobile apps: iOS 13+, Android 8+, built with Expo EAS
- Shared architecture: Web and mobile use same backend API, shared React hooks, TypeScript types
2. Once Foundational is done:
   - **Developer A**: US0 (Auth) → US2 (Payments) → US8 (Lifecycle) → US7 (Pricing)
   - **Developer B**: US1 (RAG/Docs) → US10 (Chat) → US6 (Multi-Docs) → US16 (OCR)
   - **Developer C**: US3 (Roles) → US5 (HITL) → US11 (User Mgmt) → US4 (Exam Prep)
3. Stories complete and integrate independently
4. Polish phase as full team

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- US12 (Role Switching) is DEPRECATED — single-role-per-user model enforced
- Total infrastructure target: $200/month for 1000 active users
- AI failover: Gemini primary → OpenAI backup, <3s switch time
