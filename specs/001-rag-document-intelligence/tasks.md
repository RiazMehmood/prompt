# Tasks: Prompt – Multi-Tenant AI-Powered RAG-Based Document Intelligence Platform

**Feature**: 001-rag-document-intelligence
**Branch**: 001-rag-document-intelligence
**Created**: 2026-03-22
**Status**: Active
**Input**: plan.md, spec.md, data-model.md, contracts/openapi.yaml, research.md

## Format: `[ID] [P?] [Story] Description with file path`

- **[P]**: Can run in parallel (different files, no cross-task dependencies)
- **[Story]**: User story label (US1–US7, US8=Voice Input, US9=Full Voice)
- Tests are NOT included unless explicitly requested (spec does not request TDD)

## Implementation Strategy

| Phase | Scope | Release |
|-------|-------|---------|
| Phases 1–2 | Setup + Foundation | Prerequisite |
| Phases 3–5 | US2 Auth + US1 Document Generation + Multilingual Input | **MVP** |
| Phases 6–7 | US3 Knowledge Base (OCR) + US4 Subscriptions | **Pilot** |
| Phases 8–10 | US5 Domains + US6 Tokens + US7 Analytics | **Pilot / Full Scale** |
| Phase 11 | Voice Input (Whisper) | **Pilot** |
| Phase 12 | Full Voice Conversation (TTS) | **Full Scale** |
| Phase 13 | Polish & Cross-Cutting | All |

---

## Phase 1: Setup (Project Initialization)

**Goal**: Establish project structure and development environment

- [x] T001 Create directory structure: backend/, frontend/, mobile/, shared/ per plan.md
- [x] T002 Initialize backend Python 3.11 project with pyproject.toml and FastAPI dependencies in backend/pyproject.toml
- [x] T003 [P] Initialize frontend Next.js 14 (TypeScript) project with Tailwind CSS in frontend/package.json
- [x] T004 [P] Initialize React Native bare project (TypeScript) with NativeWind in mobile/package.json
- [x] T005 [P] Initialize shared TypeScript package for API types and hooks in shared/package.json
- [x] T006 Create root .gitignore covering Python, Node, React Native, env files in .gitignore
- [x] T007 [P] Create backend/.env.example with all required env vars from quickstart.md

---

## Phase 2: Foundational Infrastructure (Blocking Prerequisites)

**Goal**: Core infrastructure that ALL user stories depend on. No story work begins until this phase is complete.

**⚠️ CRITICAL GATE**: All 7 constitution principles must pass before proceeding.

### Backend Foundation

- [x] T008 Create FastAPI application entry point with CORS, lifespan, and middleware registration in backend/src/main.py
- [x] T009 Create centralised config with Pydantic Settings loading all env vars in backend/src/config.py
- [x] T010 [P] Setup structured JSON logging (timestamp, level, tenant_id, request_id) in backend/src/utils/logging.py
- [x] T011 [P] Create global HTTP error taxonomy handler (400/401/403/404/422/500) in backend/src/api/middleware.py
- [x] T012 Create Supabase client singleton with service-role and anon-key modes in backend/src/db/supabase_client.py

### Database

- [x] T013 Write Supabase SQL migration: create users, domains, templates, documents, embeddings tables with all fields from data-model.md in backend/supabase/migrations/001_core_tables.sql
- [x] T014 Write Supabase SQL migration: create generated_documents, subscriptions, promotional_tokens, token_usage, usage_logs, voice_sessions tables in backend/supabase/migrations/002_feature_tables.sql
- [x] T015 Write Supabase SQL migration: enable RLS and create Row Level Security policies for all tables (user isolation, domain isolation, admin overrides) in backend/supabase/migrations/003_rls_policies.sql
- [x] T016 [P] Create GIN indexes on JSONB metadata columns and composite indexes per data-model.md in backend/supabase/migrations/004_indexes.sql
- [x] T017 Write seed data SQL: default Legal domain, sample templates, root admin user in backend/supabase/seed.sql

### Vector Store & Embeddings

- [x] T018 Create ChromaDB client with collection-per-domain isolation and multilingual-e5-base embedding function in backend/src/db/chromadb_client.py
- [x] T019 Create EmbeddingService wrapping multilingual-e5-base (768-dim) with batch processing and error handling in backend/src/services/rag/embeddings.py

### AI Orchestration

- [x] T020 Create Gemini API Key Rotator: round-robin across multiple keys, automatic failover on 429 errors, usage tracking in backend/src/services/ai/key_rotator.py
- [x] T021 [P] Create semantic cache service: hash query → ChromaDB similarity lookup (threshold 0.92) → return cached response in backend/src/services/ai/semantic_cache.py
- [x] T022 Create LangGraph workflow base class with state schema, node registration, and persist-after-each-node pattern in backend/src/services/workflows/base_workflow.py

### Shared TypeScript Types

- [x] T023 [P] Generate TypeScript types from Pydantic schemas for all core entities (User, Domain, Template, Document, GeneratedDocument) in shared/src/types/api.ts
- [x] T024 [P] Create shared API client with JWT auth header injection and refresh token handling in shared/src/api/client.ts

---

## Phase 3: User Story 2 – Authentication & Domain Access (Priority: P1)

**Goal**: Users register, verify identity, select domain, and gain isolated access. Prerequisite for all user story work.

**Independent Test**: Register new account → verify email → select Legal domain → confirm user can only access Legal templates and gets 403 on Education endpoints.

### Backend – Auth

- [x] T025 [US2] Create User Pydantic models (UserRegistration, UserLogin, LoginResponse, UserProfile) in backend/src/models/user.py
- [x] T026 [US2] Implement EmailAuthService: register, verify OTP, login with Supabase Auth in backend/src/services/auth/email_auth.py
- [x] T027 [P] [US2] Implement PhoneAuthService: phone registration, Twilio OTP send/verify in backend/src/services/auth/phone_auth.py
- [x] T028 [US2] Create JWT validation middleware: extract user_id + domain_id + role from Supabase JWT, attach to request state in backend/src/api/dependencies.py
- [x] T029 [US2] Implement UserService: get profile, assign domain (immutable after first assignment), update usage counters in backend/src/services/user_service.py
- [x] T030 [US2] Create auth router with POST /auth/register, /auth/login, /auth/verify-email, /auth/verify-phone, /auth/refresh endpoints in backend/src/api/v1/auth.py
- [x] T031 [US2] Create domains router with GET /domains (list active), GET /domains/{id} (detail) endpoints in backend/src/api/v1/domains.py

### Mobile – Auth Screens

- [x] T032 [P] [US2] Create AuthContext and useAuth hook with login, register, logout, refresh state in mobile/src/lib/auth.ts
- [x] T033 [P] [US2] Build Login screen (email/phone toggle, form validation, error states) in mobile/src/app/(auth)/login.tsx
- [x] T034 [P] [US2] Build Register screen (email, phone, password, domain selector) in mobile/src/app/(auth)/register.tsx
- [x] T035 [P] [US2] Build OTP Verification screen with 6-digit input and resend timer in mobile/src/app/(auth)/verify.tsx
- [x] T036 [US2] Build Domain Selection screen (grid of active domains with name/icon) in mobile/src/app/(auth)/domain-select.tsx
- [x] T037 [US2] Implement secure token storage using react-native-keychain (not AsyncStorage for JWTs) in mobile/src/lib/secure-storage.ts
- [x] T038 [US2] Wire navigation: unauthenticated → Auth stack, authenticated → Tab stack, domain unassigned → Domain Select in mobile/src/app/_layout.tsx

### Frontend (Admin) – Auth

- [x] T039 [P] [US2] Build admin login page (email only, admin role required) in frontend/src/app/(auth)/login/page.tsx
- [x] T040 [P] [US2] Create NextAuth or custom session handler with role check (redirect non-admin to error page) in frontend/src/lib/auth.ts

**✅ Checkpoint**: US2 complete — register → verify → domain select → authenticated session with domain isolation working.

---

## Phase 4: User Story 1 – Professional Document Generation (Priority: P1) 🎯 MVP

**Goal**: Authenticated user selects document type, provides required fields, receives a fully validated domain-compliant document in under 60 seconds.

**Independent Test**: Authenticated lawyer → select Bail Application template → fill accused name/FIR number/section → receive formatted document with RAG citations, confidence ≥ 0.75 on all fields.

### Backend – RAG Engine

- [x] T041 [US1] Create DocumentChunkingService: split approved document text into chapter/section chunks (512 tokens, 50-token overlap) with metadata in backend/src/services/rag/chunking.py
- [x] T042 [US1] Create RAGRetrievalService: query ChromaDB with domain namespace filter + confidence threshold (0.75) + metadata filters in backend/src/services/rag/retrieval.py
- [x] T043 [US1] Create ProvenanceTracker: log (slot_name, source_doc_id, chunk_id, confidence) for every template slot populated in backend/src/services/rag/provenance.py

### Backend – Template & Data Binding Engine

- [x] T044 [US1] Create Template Pydantic models (TemplateCreate, TemplateResponse, SlotDefinition, FormattingRules) in backend/src/models/template.py
- [x] T045 [US1] Implement TemplateService: parse {{slot}} syntax, validate all slots defined, CRUD operations in backend/src/services/template_service.py
- [x] T046 [US1] Implement DataBindingEngine: fill template slots from (a) user input or (b) RAG retrieval ≥ 0.75 — reject any slot filled by free AI generation in backend/src/services/data_binding.py
- [x] T047 [US1] Implement ValidationEngine: check all required slots filled, no ungrounded content, formatting rules met, produce provenance report in backend/src/services/validation_engine.py

### Backend – Document Generation LangGraph Workflow

- [x] T048 [US1] Define LangGraph DocumentGenerationWorkflow with nodes: QueryAgent → PlannerAgent → RetrievalAgent → GeneratorAgent → ValidationAgent in backend/src/services/workflows/document_generation.py
- [x] T049 [US1] Implement QueryAgent node: parse user input, identify template to use, extract required field values in backend/src/services/workflows/nodes/query_agent.py
- [x] T050 [US1] Implement PlannerAgent node: decompose complex requests, identify missing fields, request clarification if needed in backend/src/services/workflows/nodes/planner_agent.py
- [x] T051 [US1] Implement GeneratorAgent node: execute DataBindingEngine with RAG-retrieved data, assemble final template in backend/src/services/workflows/nodes/generator_agent.py
- [x] T052 [US1] Implement ValidationAgent node: execute ValidationEngine, return validation report with pass/fail + provenance in backend/src/services/workflows/nodes/validation_agent.py

### Backend – Document Output (PDF/DOCX)

- [x] T053 [P] [US1] Implement PDFExportService using ReportLab: domain-specific paper size (Legal 8.5"×14" for Legal domain), margins, citation formatting in backend/src/services/documents/pdf_export.py
- [x] T054 [P] [US1] Implement DOCXExportService using python-docx: preserve structure, heading styles, RTL support for Urdu content in backend/src/services/documents/docx_export.py
- [x] T055 [US1] Create GeneratedDocument Pydantic models (GenerateRequest, GenerateResponse, DocumentDetail) with output_language field in backend/src/models/generated_document.py
- [x] T056 [US1] Create generate router: POST /generate (trigger workflow), GET /generate/{id} (status), GET /generate/{id}/export?format=pdf|docx in backend/src/api/v1/generate.py

### Mobile – Document Generation Screens

- [x] T057 [US1] Build Dashboard screen: domain banner, template category grid, recent documents list in mobile/src/app/(tabs)/dashboard.tsx
- [x] T058 [US1] Build Template Selection screen: list templates for user's domain with description and slot preview in mobile/src/app/generate/template-select.tsx
- [x] T059 [US1] Build Document Generation form screen: dynamic form from template slot definitions, input validation, submit handler in mobile/src/app/generate/[template_id].tsx
- [x] T060 [US1] Build Generation Progress screen: polling status, animated progress indicator, timeout handling at 60s in mobile/src/app/generate/progress.tsx
- [x] T061 [US1] Build Generated Document Viewer: structured in-app view with provenance sidebar, export buttons (PDF / DOCX) in mobile/src/app/generate/result/[doc_id].tsx
- [x] T062 [US1] Implement native share sheet for PDF/DOCX export using React Native Share API in mobile/src/components/generate/ExportShareButton.tsx
- [x] T063 [US1] Create useDocumentGeneration hook: trigger generation, poll status, handle errors and timeouts in mobile/src/lib/hooks/useDocumentGeneration.ts

### Frontend (Admin) – Template Management

- [x] T064 [P] [US1] Build admin template list page with domain filter and create/edit/deactivate actions in frontend/src/app/admin/templates/page.tsx
- [x] T065 [P] [US1] Build template editor form: slot definition builder, formatting rules, version management in frontend/src/app/admin/templates/[id]/page.tsx

**✅ Checkpoint**: US1 complete — end-to-end document generation working on mobile with PDF export.

---

## Phase 5: Multilingual Conversation Input (MVP – FR-055 to FR-057)

**Goal**: Users type queries in English, Urdu, or Sindhi on the AI interaction screen. Agent auto-detects language and responds in same script with correct RTL rendering.

**Independent Test**: Type "بیل درخواست کی ضرورت ہے" (Urdu) in the interaction screen → agent detects Urdu → responds in correct Urdu script → response displays RTL in mobile and generated output is in Urdu.

### Backend – Multilingual Conversation

- [x] T066 [US1] Create LanguageDetectionService using langdetect: detect English/Urdu/Sindhi from text input with fallback to English in backend/src/services/language/detection.py
- [x] T067 [US1] Create MultilingualQueryRouter: translate Urdu/Sindhi queries for English-only KBs (using Gemini), retrieve, translate response back in backend/src/services/language/query_router.py
- [x] T068 [US1] Create ConversationRequest/ConversationResponse Pydantic models with language_hint, response_language, rag_sources fields in backend/src/models/conversation.py
- [x] T069 [US1] Create conversation router: POST /conversation with multilingual query handling, same-script response guarantee in backend/src/api/v1/conversation.py
- [x] T070 [US1] Update PDFExportService: add Jameel Noori Nastaleeq font for Urdu, Sindh Naskh for Sindhi, RTL page layout (output_language from GeneratedDocument) in backend/src/services/documents/pdf_export.py
- [x] T071 [US1] Update DOCXExportService: add RTL section property, Urdu/Sindhi font embedding in docx output in backend/src/services/documents/docx_export.py

### Mobile – Multilingual UI

- [x] T072 [US1] Build AI Interaction screen with RTL-aware TextInput (auto-switches layout direction on Urdu/Sindhi detection) in mobile/src/app/(tabs)/interact.tsx
- [x] T073 [US1] Create LanguageIndicator component: shows detected language with flag icon in input field footer in mobile/src/components/generate/LanguageIndicator.tsx
- [x] T074 [US1] Implement I18nManager RTL switching: when user types in Urdu/Sindhi, trigger forceRTL for input field only (not full app) in mobile/src/lib/rtl.ts
- [x] T075 [US1] Update Document Generation form: support Urdu/Sindhi text input in all string slot fields, preserve script in output_parameters JSONB in mobile/src/app/generate/[template_id].tsx
- [x] T076 [US1] Add language output selector to generation form (English / Urdu / Sindhi), disable unavailable languages per domain config in mobile/src/components/generate/LanguageSelector.tsx

**✅ Checkpoint**: Multilingual MVP complete — RTL input, auto-detect, same-script responses, Urdu/Sindhi PDF output.

---

## Phase 6: User Story 3 – Knowledge Base Upload & OCR Pipeline (Priority: P2)

**Goal**: Admin uploads PDFs (including photographed books), OCR extracts text from image pages including Urdu/Sindhi, document goes through review → approval → RAG indexing.

**Independent Test**: Upload a photographed Urdu textbook PDF → admin review queue shows document with OCR-extracted Urdu text → approve → document queryable via RAG search with Urdu query.

### Backend – OCR Service

- [x] T077 [US3] Install and configure Tesseract with Urdu (urd) and Sindhi (snd) language packs; create wrapper in backend/src/services/ocr/tesseract_engine.py
- [x] T078 [US3] Create EasyOCR engine wrapper as fallback for pages where Tesseract confidence < 70% in backend/src/services/ocr/easyocr_engine.py
- [x] T079 [US3] Implement OCROrchestrator: detect image pages (< 50 chars extractable), classify script, run Tesseract → EasyOCR fallback, return per-page results with confidence scores in backend/src/services/ocr/orchestrator.py
- [x] T080 [US3] Create RTLPreprocessor: preserve reading order for RTL extracted text, tag with direction metadata, normalise Urdu Unicode variants using UrduText in backend/src/services/ocr/rtl_preprocessor.py
- [x] T081 [US3] Implement OCR confidence evaluator: flag pages < 70% confidence for admin review, aggregate ocr_confidence_avg, populate ocr_flagged_pages JSONB on Document entity in backend/src/services/ocr/confidence_evaluator.py

### Backend – Document Ingestion Pipeline

- [x] T082 [US3] Create DocumentIngestionWorkflow (LangGraph): Upload → OCR (if image pages) → TextExtraction → Chunking → MetadataTagging → StatusUpdate(pending) in backend/src/services/workflows/document_ingestion.py
- [x] T083 [US3] Implement TextExtractionService: pdfplumber for text-searchable pages + OCROrchestrator for image pages + merge results per page in backend/src/services/documents/text_extraction.py
- [x] T084 [US3] Create DocumentApprovalService: approve (triggers embedding generation + ChromaDB indexing), reject (store reason, notify uploader) in backend/src/services/documents/approval_service.py
- [x] T085 [US3] Create EmbeddingIngestionService: chunk approved document text → multilingual-e5-base embed → store in ChromaDB with domain namespace + language + is_ocr_derived metadata in backend/src/services/rag/ingestion.py
- [x] T086 [US3] Create documents router: POST /documents/upload (multipart), GET /documents (list by domain/status), GET /documents/{id}, PATCH /documents/{id}/approve, PATCH /documents/{id}/reject in backend/src/api/v1/documents.py

### Mobile – Document Upload

- [x] T087 [P] [US3] Build Document Upload screen: file picker (PDF), camera capture for direct book photo, progress indicator, upload error handling in mobile/src/app/documents/upload.tsx
- [x] T088 [P] [US3] Build Uploaded Documents list screen: show status badges (pending/approved/rejected), OCR confidence warning for flagged documents in mobile/src/app/documents/list.tsx
- [x] T089 [US3] Create useDocumentUpload hook: multipart POST, upload progress, poll document status after upload in mobile/src/lib/hooks/useDocumentUpload.ts

### Frontend (Admin) – Document Review Queue

- [x] T090 [P] [US3] Build admin document review queue page: list pending docs, OCR confidence score, flagged pages warning, approve/reject form in frontend/src/app/admin/documents/page.tsx
- [x] T091 [P] [US3] Build document detail/review page: page-by-page OCR text preview, confidence score per page, approve/reject with reason in frontend/src/app/admin/documents/[id]/page.tsx

**✅ Checkpoint**: US3 complete — photographed Urdu/Sindhi textbook uploaded → OCR extracted → admin reviewed → queryable via RAG.

---

## Phase 7: User Story 4 – Subscription & Billing (Priority: P2)

**Goal**: Users view subscription tiers, see usage limits, get prompted to upgrade when limit reached. MVP: Basic (free) only; paid tiers show "Coming Soon".

**Independent Test**: Basic user hits 5-doc/day limit → upgrade prompt shown → paid tiers display "Coming Soon" → cannot purchase → counter resets at midnight.

### Backend – Subscriptions

- [x] T092 [US4] Create Subscription Pydantic models (SubscriptionTier enum, SubscriptionDetail, UsageLimits) in backend/src/models/subscription.py
- [x] T093 [US4] Implement SubscriptionService: get current tier, enforce usage limits (doc generations/day, uploads/day), increment counters, reset at midnight UTC in backend/src/services/subscriptions/subscription_service.py
- [x] T094 [US4] Add usage limit check middleware: inject into generate and upload endpoints, return 429 with upgrade prompt when limit reached in backend/src/api/dependencies.py
- [x] T095 [US4] Create subscriptions router: GET /subscriptions/current, GET /subscriptions/tiers (list all with features), GET /subscriptions/usage in backend/src/api/v1/subscriptions.py

### Mobile – Subscription Screens

- [x] T096 [P] [US4] Build Subscription screen: tier comparison table (Basic active, Pro/Premium/Institutional "Coming Soon"), current usage display in mobile/src/app/(tabs)/subscription.tsx
- [x] T097 [P] [US4] Build Usage Limit reached modal: current usage, tier limit, upgrade CTA (disabled with "Coming Soon" label), option to continue later in mobile/src/components/subscription/UsageLimitModal.tsx
- [x] T098 [US4] Create useSubscription hook: fetch current tier, usage counters, listen for 429 responses and trigger limit modal in mobile/src/lib/hooks/useSubscription.ts

**✅ Checkpoint**: US4 complete — usage limits enforced, upgrade flow stubbed for Phase 2 payment integration.

---

## Phase 8: User Story 5 – Dynamic Domain Creation (Priority: P3)

**Goal**: Root admin creates a new professional domain (e.g., Engineering) via web admin, uploads knowledge base, configures templates — all without code changes.

**Independent Test**: Create "Engineering" domain via admin → upload engineering standards PDF → create "Project Estimation" template → assign to test user → user generates test document from new domain.

### Backend – Dynamic Domain Service

- [x] T099 [US5] Create Domain Pydantic models (DomainCreate, DomainConfig, DomainUpdate) with configuration JSONB schema in backend/src/models/domain.py
- [x] T100 [US5] Implement DomainService: create domain (auto-generate vector namespace), update config, toggle active/inactive, prevent deletion if active users in backend/src/services/domain_service.py
- [x] T101 [US5] Update domains router: POST /domains (root_admin only), PATCH /domains/{id}, DELETE /domains/{id} (with user-count guard) in backend/src/api/v1/domains.py
- [x] T102 [US5] Implement DomainConfigService: per-domain agent parameters (AI persona, output language list, document types), formatting rules stored in configuration JSONB in backend/src/services/domain_config_service.py

### Frontend (Admin) – Domain Management

- [x] T103 [P] [US5] Build admin domain management page: domain list with status, create/edit/deactivate actions in frontend/src/app/admin/domains/page.tsx
- [x] T104 [P] [US5] Build domain creation wizard: name, description, icon upload, supported output languages, AI persona config, knowledge base namespace in frontend/src/app/admin/domains/create/page.tsx
- [x] T105 [US5] Build domain configuration editor: agent parameters, document type list, supported output languages, default formatting rules in frontend/src/app/admin/domains/[id]/config/page.tsx

**✅ Checkpoint**: US5 complete — new domain created, knowledge base uploaded, templates configured, end-to-end doc generation verified.

---

## Phase 9: User Story 6 – Promotional Token Application (Priority: P3)

**Goal**: Users apply discount/credit token codes; system validates expiry, usage limits, domain restrictions, applies benefit.

**Independent Test**: Create "LEGAL30" token (30% off Pro, Legal-only, 10 uses) in admin → apply in mobile → benefit shown → counter decrements → second apply by same user rejected.

### Backend – Token Service

- [x] T106 [US6] Create PromotionalToken Pydantic models (TokenCreate, TokenValidation, TokenApplicationResult) in backend/src/models/promo_token.py
- [x] T107 [US6] Implement TokenService: validate code (expiry, usage count, domain restriction, one-per-user), apply benefit, increment usage counter atomically in backend/src/services/token_service.py
- [x] T108 [US6] Create tokens router: POST /tokens/validate (preview benefit), POST /tokens/apply (apply + record usage) in backend/src/api/v1/tokens.py

### Mobile & Admin – Token Screens

- [x] T109 [P] [US6] Build Token Apply screen: code input, preview benefit (calls /tokens/validate), confirm apply button in mobile/src/app/(tabs)/token.tsx
- [x] T110 [P] [US6] Build admin token management page: create token form (discount type, value, limits, expiry, domain restriction), list active tokens in frontend/src/app/admin/tokens/page.tsx

**✅ Checkpoint**: US6 complete — full token lifecycle: create in admin → apply in mobile → usage tracked → limits enforced.

---

## Phase 10: User Story 7 – Analytics Dashboard (Priority: P3)

**Goal**: Admin views revenue trends, subscription distribution, churn rate, document generation volume, domain usage, token performance with date range and domain filters.

**Independent Test**: Log in to admin analytics dashboard → select last 30 days → confirm charts show real subscription counts, document generation volume per domain, and token redemption rates from actual data.

### Backend – Analytics Service

- [x] T111 [US7] Implement AnalyticsAgent LangGraph node: query UsageLog, aggregate metrics (revenue, active users, churn, doc volume, token performance) by date range and domain in backend/src/services/workflows/nodes/analytics_agent.py
- [x] T112 [US7] Create AnalyticsService: compute subscription distribution, churn rate (expired not renewed / total), generation volume, domain breakdown in backend/src/services/analytics_service.py
- [x] T113 [US7] Create analytics router: GET /analytics/overview, GET /analytics/subscriptions, GET /analytics/documents, GET /analytics/domains, GET /analytics/tokens — all support ?from=&to=&domain_id= filters in backend/src/api/v1/analytics.py

### Frontend (Admin) – Analytics Dashboard

- [x] T114 [P] [US7] Build analytics dashboard page with date range picker and domain filter in frontend/src/app/admin/analytics/page.tsx
- [x] T115 [P] [US7] Build Revenue & Subscription chart components (line chart: revenue trend, pie: tier distribution) in frontend/src/components/analytics/RevenueCharts.tsx
- [x] T116 [P] [US7] Build Domain Usage chart components (bar chart: generations per domain, table: active users per domain) in frontend/src/components/analytics/DomainUsageCharts.tsx
- [x] T117 [P] [US7] Build Token Performance component (table: token code, redemption rate, revenue impact, remaining uses) in frontend/src/components/analytics/TokenPerformance.tsx

**✅ Checkpoint**: US7 complete — admin analytics fully populated with real data across all date ranges and domains.

---

## Phase 11: Voice Input – Speech to Text (Phase 2 – Pilot)

**Goal**: Users tap microphone on AI Interaction screen, speak in English/Urdu/Sindhi, see transcription in correct RTL script for review, confirm to submit as query.

**Independent Test**: Open AI Interaction screen → tap mic → speak "مجھے بیل درخواست چاہیے" (Urdu) → transcription appears in correct Urdu Nastaliq script → user confirms → query submitted to domain agent → agent responds in Urdu.

### Backend – Voice Transcription

- [x] T118 [US8] Create VoiceSession Pydantic models (TranscribeRequest, TranscribeResponse with confidence, SpeechSynthesisRequest) in backend/src/models/voice.py
- [x] T119 [US8] Implement WhisperTranscriptionService: receive audio file, call OpenAI Whisper API with language hint, return transcription in original script (no transliteration), store temp audio path in backend/src/services/voice/whisper_service.py
- [x] T120 [US8] Implement AudioCleanupService: delete temp audio file within 30 seconds of transcription completion (GDPR), update VoiceSession.audio_file_path to null in backend/src/services/voice/audio_cleanup.py
- [x] T121 [US8] Create voice router: POST /voice/transcribe (multipart audio upload), GET /voice/sessions/{id} (status check) in backend/src/api/v1/voice.py
- [x] T122 [US8] Persist VoiceSession record per transcription request (lifecycle: recording → processing → completed/failed) in backend/src/services/voice/session_service.py

### Mobile – Voice Input UI

- [x] T123 [US8] Create VoiceInput component: animated microphone button, recording indicator, waveform visualization during recording in mobile/src/components/voice/VoiceInput.tsx
- [x] T124 [US8] Implement audio recording hook: react-native-audio-recorder-player, WAV output, max 60s, stop on silence detection in mobile/src/lib/hooks/useAudioRecorder.ts
- [x] T125 [US8] Build Transcription Review overlay: shows transcription text in detected script (RTL for Urdu/Sindhi), confidence indicator, edit/confirm/re-record actions in mobile/src/components/voice/TranscriptionReview.tsx
- [x] T126 [US8] Integrate VoiceInput into AI Interaction screen: microphone button in input bar, result flows to message input after user confirmation in mobile/src/app/(tabs)/interact.tsx
- [x] T127 [US8] Show low-confidence warning (confidence < 0.8) on TranscriptionReview overlay: "Low confidence — please review carefully" indicator in mobile/src/components/voice/TranscriptionReview.tsx

**✅ Checkpoint**: Voice input complete — speak Urdu/Sindhi → see correct script transcription → confirm → agent responds in same language.

---

## Phase 12: Full Voice Conversation – Text to Speech (Phase 3 – Full Scale)

**Goal**: Domain agent speaks responses aloud in English, Urdu, or Sindhi. Continuous hands-free voice conversation mode for domain queries.

**Independent Test**: Enable voice conversation mode → ask query by voice in Urdu → agent responds with Urdu audio from Google Cloud TTS WaveNet Urdu voice → round-trip completes in under 8 seconds.

### Backend – Speech Synthesis

- [x] T128 [US9] Implement GoogleTTSService: English (Standard), Urdu (WaveNet ur-IN-Wavenet-A), Sindhi (Urdu voice as fallback with user notice) in backend/src/services/voice/tts_service.py
- [x] T129 [US9] Implement TTS audio cache: hash (text + language) → S3/local cache → serve cached audio (avoids duplicate TTS API calls for repeated responses) in backend/src/services/voice/tts_cache.py
- [x] T130 [US9] Create speech synthesis router: POST /voice/synthesize → returns audio/mpeg stream, cached if available in backend/src/api/v1/voice.py
- [x] T131 [US9] Update ConversationResponse: add audio_url field (optional, populated when voice synthesis requested by client) in backend/src/models/conversation.py

### Mobile – Voice Conversation Mode

- [x] T132 [US9] Build Voice Conversation mode screen: full-screen voice UI, push-to-talk or continuous VAD, shows transcript of both user and agent turns in mobile/src/app/(tabs)/voice-chat.tsx
- [x] T133 [US9] Implement audio playback hook: download agent audio response, queue playback, handle interruption when user starts speaking in mobile/src/lib/hooks/useAudioPlayback.ts
- [x] T134 [US9] Add Sindhi TTS fallback notice component: "Sindhi voice synthesis uses Urdu voice model" dismissible notice shown on first Sindhi audio response in mobile/src/components/voice/SindhiTTSNotice.tsx
- [x] T135 [US9] Wire continuous conversation loop: user audio → Whisper → ConversationAPI → GoogleTTS → playback → detect silence → restart recording in mobile/src/lib/voice-conversation-loop.ts

**✅ Checkpoint**: Full voice conversation complete — hands-free domain consultation in English/Urdu/Sindhi within 8-second round-trip.

---

## Phase 13: Polish & Cross-Cutting Concerns

**Goal**: Security hardening, performance optimisation, monitoring, offline support, documentation.

### Security

- [x] T136 Add rate limiting middleware: 10 req/min per tenant (free tier), 100 req/min (paid), 100 req/hour per IP for auth endpoints in backend/src/api/middleware.py
- [x] T137 [P] Add input sanitisation for all user-provided text: strip HTML, validate length limits, prevent injection in backend/src/utils/sanitisation.py
- [x] T138 [P] Add PDF virus scanning hook on upload: ClamAV local scan, reject if infected in backend/src/services/documents/virus_scan.py

### Performance

- [x] T139 Add connection pooling for Supabase PostgreSQL queries (pgbouncer settings) in backend/src/db/supabase_client.py
- [x] T140 [P] Add Redis-based response cache for identical generate requests (idempotency key matching) in backend/src/services/ai/response_cache.py
- [x] T141 [P] Implement CDN-served PDF exports (store in Supabase Storage, return signed URLs instead of streaming) in backend/src/services/documents/storage_service.py

### Monitoring & Free-Tier Tracking

- [x] T142 [P] Create free-tier usage dashboard endpoint: DB size %, bandwidth %, API call count — alert at 80% in backend/src/api/v1/admin.py
- [x] T143 [P] Add Sentry (or equivalent free-tier error tracking) integration with tenant_id and request_id context in backend/src/utils/error_tracking.py

### Mobile Offline Support

- [x] T144 [P] Implement offline action queue: queue generate/upload requests when offline, sync on reconnect using NetInfo + AsyncStorage in mobile/src/lib/offline-queue.ts
- [x] T145 [P] Cache last 10 generated documents for offline viewing in mobile/src/lib/document-cache.ts

### Documentation & Deployment

- [x] T146 [P] Update quickstart.md with Tesseract install instructions (Ubuntu: `apt-get install tesseract-ocr tesseract-ocr-urd`) in specs/001-rag-document-intelligence/quickstart.md
- [x] T147 [P] Create Docker Compose file for local development (backend + ChromaDB + Tesseract) in docker-compose.yml
- [x] T148 Run full end-to-end validation against all acceptance scenarios from spec.md SC-001 through SC-016

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup) → Phase 2 (Foundation) → Phases 3–13 (Stories)
```

- **Phase 1**: No dependencies — start immediately
- **Phase 2**: Requires Phase 1 — BLOCKS all user story phases
- **Phase 3 (US2)**: Requires Phase 2 — auth must be working before any feature
- **Phase 4 (US1)**: Requires Phase 3 (US2) — needs authenticated users
- **Phase 5 (Multilingual Input)**: Requires Phase 4 (US1) — extends existing generation
- **Phase 6 (US3 OCR)**: Requires Phase 2 — parallel with Phase 3/4 possible
- **Phase 7 (US4 Subscriptions)**: Requires Phase 3 (US2) — needs user accounts
- **Phases 8–10 (US5/US6/US7)**: Require Phase 3 (US2) + respective earlier stories
- **Phase 11 (Voice Input)**: Requires Phase 5 (Multilingual Input) — extends conversation screen
- **Phase 12 (Full Voice)**: Requires Phase 11 (Voice Input) — extends voice pipeline
- **Phase 13 (Polish)**: Requires all user story phases complete

### User Story Dependencies

```
US2 (Auth) ← US1 (Generation) ← Multilingual Input
                               ← US3 (Knowledge Base)
         ← US4 (Subscriptions) ← US6 (Tokens)
         ← US5 (Dynamic Domains)
         ← US7 (Analytics) ← all stories
Multilingual Input ← US8 (Voice Input) ← US9 (Full Voice)
```

### Parallel Execution Opportunities (Post-Foundation)

```
After Phase 2 completes:
  Track A (MVP):    Phase 3 → Phase 4 → Phase 5
  Track B (Upload): Phase 6 (US3) — parallel with Track A
  Track C (Billing): Phase 7 (US4) — after Phase 3

After MVP complete:
  Track A: Phase 8 (US5) → Phase 9 (US6) → Phase 10 (US7)
  Track B: Phase 11 (Voice Input) → Phase 12 (Full Voice)
```

---

## Summary

| Phase | Story | Tasks | Release |
|-------|-------|-------|---------|
| Phase 1 | Setup | T001–T007 | 7 tasks |
| Phase 2 | Foundation | T008–T024 | 17 tasks |
| Phase 3 | US2 Auth | T025–T040 | 16 tasks |
| Phase 4 | US1 Document Gen | T041–T065 | 25 tasks |
| Phase 5 | Multilingual Input | T066–T076 | 11 tasks |
| Phase 6 | US3 OCR + KB | T077–T091 | 15 tasks |
| Phase 7 | US4 Subscriptions | T092–T098 | 7 tasks |
| Phase 8 | US5 Domains | T099–T105 | 7 tasks |
| Phase 9 | US6 Tokens | T106–T110 | 5 tasks |
| Phase 10 | US7 Analytics | T111–T117 | 7 tasks |
| Phase 11 | US8 Voice Input | T118–T127 | 10 tasks |
| Phase 12 | US9 Full Voice | T128–T135 | 8 tasks |
| Phase 13 | Polish | T136–T148 | 13 tasks |
| **Total** | | **T001–T148** | **148 tasks** |

### MVP Scope (Phases 1–5)

**76 tasks** covering: project setup, foundational infrastructure, user authentication, professional document generation, Urdu/Sindhi multilingual input and output.

**MVP delivers**: A Pakistani professional (lawyer or teacher) can register → select domain → generate a domain-compliant document in English/Urdu/Sindhi → export as PDF with correct RTL rendering → all within 60 seconds.
