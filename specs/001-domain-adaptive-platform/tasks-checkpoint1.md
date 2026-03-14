# Tasks: Checkpoint 1 - Free MVP (Lawyers Domain Only)

**Checkpoint**: 1 - Free MVP (Weeks 1-6)
**Goal**: Working demo for investors - lawyers domain only, $0/month
**Input**: Design documents from `/specs/001-domain-adaptive-platform/`
**Stack**: Vercel Serverless + Supabase Free + Upstash Redis Free + Gemini Flash Free

**Scope**:
- ✅ US0: Authentication (email/phone/Google)
- ✅ US1: RAG + Document Generation (lawyers only)
- ✅ US10: Chat Interface
- ✅ US3: Role Management (Root Admin only)
- ✅ US5: HITL Document Approval (Root Admin only)
- ❌ US2: Payments (Subscription UI only, test mode)
- ❌ Other domains (doctors, teachers, etc.)
- ❌ App stores (Expo Go only)

**Deliverables**:
- Web app on Vercel
- Mobile app via Expo Go (QR code)
- 10-20 test users (lawyers)
- 50-100 legal documents in vector DB
- Demo video (3-5 minutes)

**Total Tasks**: 68 (filtered from 219 full-scale tasks)

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US0, US1, US10)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/src/`, `backend/tests/`
- **Frontend Web**: `frontend/src/`
- **Frontend Mobile**: `mobile/`
- **Infrastructure**: `infrastructure/` (minimal for Checkpoint 1)

---

## Phase 1: Setup (Checkpoint 1 - Vercel + Supabase Free)

**Purpose**: Project initialization for free tier stack

**Duration**: Week 1 (Days 1-3)

- [X] T001 Create project directory structure (`backend/`, `frontend/`, `mobile/`, `shared/`)
- [X] T002 [P] Initialize Python backend project with requirements.txt (FastAPI 0.109+, LangChain 0.1+, Supabase client, google-auth, httpx, python-jose, passlib, python-docx, pydantic 2.x) - **Note**: Vercel serverless compatible
- [X] T003 [P] Initialize Next.js 14 frontend project with package.json (React 18, TanStack Query, Zustand, Tailwind CSS, shadcn/ui) in `frontend/`
- [X] T004 [P] Initialize Expo mobile project with package.json (Expo SDK 50+, React Native 0.73+, React Navigation 6+, NativeWind, Expo SecureStore, React Native Paper) in `mobile/`
- [X] T005 [P] Create npm workspaces configuration in root `package.json` with workspaces: ["frontend", "mobile", "shared"]
- [X] T006 [P] Create shared package in `shared/package.json` with exports for hooks, stores, types, api, utils
- [X] T007 [P] Create backend environment configuration in `backend/src/config.py` with Supabase URL, Supabase Key, JWT secret, Gemini API key, Google OAuth credentials
- [X] T008 [P] Create frontend environment configuration with `.env.local.example` (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_API_URL)
- [X] T009 [P] Create mobile environment configuration with `mobile/.env.example` and `mobile/app.json` (Expo config)
- [X] T010 [P] Configure backend linting (ruff) and formatting (black) with `pyproject.toml`
- [X] T011 [P] Configure frontend linting (ESLint) and formatting (Prettier) with `frontend/.eslintrc.json`
- [X] T012 [P] Configure mobile linting (ESLint) and formatting (Prettier) with `mobile/.eslintrc.json`
- [X] T013 [P] Create Vercel configuration in `vercel.json` for serverless functions deployment (backend API routes)
- [X] T014 [P] Setup GitHub repository with README.md, .gitignore, and initial commit

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story

**Duration**: Week 1 (Days 4-7)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database & ORM Foundation

- [X] T015 Connect to Supabase Free (500MB PostgreSQL + pgvector) and verify connection in `backend/src/db/supabase_client.py`
- [X] T016 Create database session management module in `backend/src/db/session.py` with async Supabase client, connection pooling
- [X] T017 [P] Create Role model (Pydantic + Supabase schema) in `backend/src/models/role.py` with fields: role_id, role_name (default: "lawyer"), display_name, category, ai_persona_prompt, sidebar_features (JSON), created_at
- [X] T018 [P] Create User model (Pydantic + Supabase schema) in `backend/src/models/user.py` with fields: user_id, tenant_id, email (nullable), password_hash (nullable), phone_number (nullable), auth_method, google_id (nullable), full_name, role_id (FK→roles, default: lawyer), account_status, created_at
- [X] T019 [P] Create Admin model (Pydantic + Supabase schema) in `backend/src/models/admin.py` with fields: admin_id, user_id, admin_type (default: "root"), permissions (JSON), created_at, is_active
- [X] T020 Create Supabase migrations for Role, User, Admin tables using Supabase CLI in `backend/supabase/migrations/`
- [ ] T021 Create Row-Level Security (RLS) policies in Supabase dashboard for users, documents, chat_sessions tables
- [ ] T022 Create database seed script in `backend/scripts/seed_data.py` with: 1 lawyer role, 1 Root Admin user, 50-100 sample legal documents (PPC, CrPC sections)

### API Framework & Middleware

- [X] T023 Create FastAPI application entry point in `backend/src/main.py` with CORS (allow Vercel frontend), health check endpoint (`/health`), API v1 router mounting
- [X] T024 [P] Create JWT authentication middleware in `backend/src/api/middleware.py` with token validation, rate limiting (Upstash Redis Free), CORS configuration
- [X] T025 [P] Create FastAPI dependencies module in `backend/src/api/dependencies.py` with `get_db` (Supabase client), `get_current_user` (JWT decode), `get_admin_user` (admin check)
- [X] T026 [P] Create shared Pydantic response/error schemas in `backend/src/models/common.py` with Error schema, pagination models, standard response wrappers

### Frontend Framework Foundation

- [X] T027 Create Next.js 14 App Router layout in `frontend/src/app/layout.tsx` with providers (TanStack Query, Zustand)
- [X] T028 [P] Create API client module in `shared/src/api/client.ts` with typed fetch wrapper, JWT token injection, error handling (shared between web and mobile)
- [X] T029 [P] Create auth helper module in `shared/src/lib/auth.ts` with token storage (localStorage for web, Expo SecureStore for mobile), user session management
- [X] T030 [P] Create Zustand auth store in `shared/src/stores/authStore.ts` with user state, login/logout actions, token management
- [X] T031 [P] Create TypeScript API types in `shared/src/types/api.ts` matching Pydantic schemas (User, Role, Admin, Error, Document, ChatMessage)
- [X] T032 [P] Setup shadcn/ui component library with base components (Button, Input, Card, Dialog, Select, Toast) in `frontend/src/components/ui/`

### Mobile Framework Foundation

- [X] T033 Create Expo Router root layout in `mobile/app/_layout.tsx` with providers (TanStack Query, Zustand)
- [X] T034 [P] Import shared API client from `@shared/api` in mobile app
- [X] T035 [P] Import shared auth helper from `@shared/lib/auth` with Expo SecureStore adapter
- [X] T036 [P] Import shared Zustand auth store from `@shared/stores/authStore`
- [X] T037 [P] Import shared TypeScript API types from `@shared/types/api`
- [X] T038 [P] Setup React Native Paper component library with theme configuration in `mobile/lib/theme.ts`
- [X] T039 [P] Create biometric authentication helper in `mobile/lib/biometric.ts` using Expo LocalAuthentication

### Redis & Cache Infrastructure

- [X] T040 Create Upstash Redis Free connection in `backend/src/db/redis.py` with async connection, health check, key namespace utilities (10,000 commands/day limit)

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 0 — Authentication (Priority: P1) 🎯 MVP

**Goal**: Enable user signup via Email/Password, Phone OTP, or Google OAuth

**Duration**: Week 2 (Days 8-14)

**Independent Test**: Sign up with each method, verify codes work, test invalid formats, check duplicate prevention

### Backend Implementation for US0

- [ ] T041 [P] [US0] Create email authentication service in `backend/src/services/auth/email_auth.py` with signup (send 6-digit code via email, 10-min expiry), verify (check code, create account), login (email+password)
- [ ] T042 [P] [US0] Create phone OTP authentication service in `backend/src/services/auth/phone_auth.py` with signup (send SMS OTP via Twilio, 5-min expiry), verify (check OTP, create account), Pakistani format validation (+92-3XX-XXXXXXX)
- [ ] T043 [P] [US0] Create Google OAuth authentication service in `backend/src/services/auth/oauth.py` with signup (verify Google ID token, extract email/name), login, token refresh
- [ ] T044 [US0] Create auth API router in `backend/src/api/v1/auth.py` with endpoints: POST `/auth/signup/email`, POST `/auth/signup/phone`, POST `/auth/signup/google`, POST `/auth/verify/email`, POST `/auth/verify/phone`, POST `/auth/login`, POST `/auth/refresh`, GET `/auth/me`
- [ ] T045 [US0] Create trial activation service in `backend/src/services/subscriptions/trial.py` that creates trial subscription record (status: "trial", 14 days, 10 documents limit) - **Note**: No real subscription logic, just database record for UI

### Frontend Implementation for US0

- [ ] T046 [P] [US0] Create EmailSignup component in `frontend/src/components/auth/EmailSignup.tsx` with email, password (strength indicator), name, role selection (default: lawyer)
- [ ] T047 [P] [US0] Create PhoneSignup component in `frontend/src/components/auth/PhoneSignup.tsx` with phone number input (Pakistani format mask), name, role selection
- [ ] T048 [P] [US0] Create GoogleOAuth component in `frontend/src/components/auth/GoogleOAuth.tsx` with Google sign-in button, OAuth flow
- [ ] T049 [US0] Create signup page in `frontend/src/app/(auth)/signup/page.tsx` with three authentication option buttons
- [ ] T050 [US0] Create verification page in `frontend/src/app/(auth)/verify/page.tsx` with 6-digit code input, resend button (60s cooldown)
- [ ] T051 [US0] Create login page in `frontend/src/app/(auth)/login/page.tsx` with email/phone/Google login options
- [ ] T052 [US0] Create useAuth hook in `shared/src/hooks/useAuth.ts` with signup, verify, login, logout, refreshToken mutations using TanStack Query
- [ ] T053 [US0] Create dashboard layout in `frontend/src/app/(dashboard)/layout.tsx` with sidebar (lawyer-specific features), header (user info), trial status banner

### Mobile Implementation for US0

- [ ] T054 [P] [US0] Create EmailSignup screen in `mobile/components/auth/EmailSignup.tsx` using React Native Paper
- [ ] T055 [P] [US0] Create PhoneSignup screen in `mobile/components/auth/PhoneSignup.tsx` with phone input
- [ ] T056 [P] [US0] Create GoogleOAuth component in `mobile/components/auth/GoogleOAuth.tsx` using Expo AuthSession
- [ ] T057 [US0] Create signup screen in `mobile/app/(auth)/signup.tsx` with three authentication option buttons
- [ ] T058 [US0] Create verification screen in `mobile/app/(auth)/verify.tsx` with 6-digit code input
- [ ] T059 [US0] Create login screen in `mobile/app/(auth)/login.tsx` with email/phone/Google options and biometric toggle
- [ ] T060 [US0] Import shared useAuth hook from `@shared/hooks/useAuth`
- [ ] T061 [US0] Create tab navigation layout in `mobile/app/(tabs)/_layout.tsx` with bottom tabs (Home, Chat, Documents)
- [ ] T062 [US0] Implement biometric authentication flow in `mobile/lib/biometric.ts` with Face ID/Touch ID/Fingerprint support

**Checkpoint**: US0 complete — users can sign up, verify, login on web and mobile

---

## Phase 4: User Story 1 — Lawyer RAG + Document Generation (Priority: P1) 🎯 MVP

**Goal**: Enable AI-powered case analysis with RAG and bail application generation

**Duration**: Week 3-4 (Days 15-28)

**Independent Test**: Describe a case scenario, receive AI strategy analysis with citations, generate bail application document

### Backend Implementation for US1

- [ ] T063 [P] [US1] Create Document model (Pydantic + Supabase schema) in `backend/src/models/document.py` with fields: document_id, title, content, category (default: "legal"), role_id (FK→roles, default: lawyer), status ("pending"/"approved"), file_url, metadata (JSON), created_at
- [ ] T064 [P] [US1] Create ChatSession model in `backend/src/models/chat.py` with fields: session_id, user_id, role_id, messages (JSON array), created_at, last_active
- [ ] T065 [P] [US1] Create GeneratedDocument model in `backend/src/models/document.py` (same file) with fields: generated_id, user_id, document_type ("bail_application"), content, file_url, created_at
- [ ] T066 [US1] Create Supabase migrations for Document, ChatSession, GeneratedDocument tables
- [ ] T067 [P] [US1] Create Gemini AI client in `backend/src/services/ai/gemini.py` with Flash model (free tier), prompt templates for legal queries, error handling
- [ ] T068 [P] [US1] Create embeddings service in `backend/src/services/rag/embeddings.py` using Gemini text-embedding-004 (free), batch processing
- [ ] T069 [P] [US1] Create document chunking service in `backend/src/services/rag/chunking.py` with 512 token chunks, 50 token overlap
- [ ] T070 [US1] Create document ingestion pipeline in `backend/src/services/rag/ingestion.py` that: extracts text from PDF, chunks, generates embeddings, stores in Supabase pgvector
- [ ] T071 [P] [US1] Create RAG retrieval service in `backend/src/services/rag/retrieval.py` with pgvector similarity search, confidence threshold 0.75, top-k=5 results
- [ ] T072 [P] [US1] Create query cache service in `backend/src/services/rag/cache.py` using Upstash Redis Free (7-day TTL, 10k commands/day limit)
- [ ] T073 [US1] Create chat service in `backend/src/services/chat.py` with: create session, add message, retrieve context, RAG query with caching, "cannot find" fallback when confidence < 0.75
- [ ] T074 [P] [US1] Create LangGraph document generation workflow in `backend/src/services/workflows/document_gen.py` with nodes: collect_fields, validate_fields, retrieve_templates, generate_content, format_docx
- [ ] T075 [US1] Create bail application template in `backend/templates/bail_application.docx` with Pakistani court formatting (Legal size: 8.5" x 14", margins: 1" top/bottom, 1.25" left/right)
- [ ] T076 [US1] Create RAG API router in `backend/src/api/v1/rag.py` with endpoints: POST `/rag/query` (chat query with RAG), POST `/rag/generate-document` (start workflow), GET `/rag/sessions` (list chat sessions), GET `/rag/sessions/{id}` (get session messages)
- [ ] T077 [US1] Create documents API router in `backend/src/api/v1/documents.py` with endpoints: POST `/documents/upload` (user contribution), GET `/documents` (list approved documents), GET `/documents/{id}`, GET `/generated-documents` (user's generated documents)

### Frontend Implementation for US1

- [ ] T078 [P] [US1] Create ChatInterface component in `frontend/src/components/chat/ChatInterface.tsx` with message list, input box, typing indicator, RAG confidence display
- [ ] T079 [P] [US1] Create MessageList component in `frontend/src/components/chat/MessageList.tsx` with user/AI messages, citations display, timestamp
- [ ] T080 [P] [US1] Create InputBox component in `frontend/src/components/chat/InputBox.tsx` with text input, send button, file upload button
- [ ] T081 [P] [US1] Create DocumentGenerationDialog component in `frontend/src/components/documents/DocumentGenerationDialog.tsx` with document type selection (bail application), field collection form, progress indicator
- [ ] T082 [P] [US1] Create DocumentList component in `frontend/src/components/documents/DocumentList.tsx` with generated documents list, download button, preview
- [ ] T083 [US1] Create main dashboard page in `frontend/src/app/(dashboard)/page.tsx` with prominent chat interface, recent sessions sidebar
- [ ] T084 [US1] Create documents page in `frontend/src/app/(dashboard)/documents/page.tsx` with generated documents list, upload button
- [ ] T085 [US1] Create useChat hook in `shared/src/hooks/useChat.ts` with query, generateDocument, getSessions mutations
- [ ] T086 [US1] Create useDocuments hook in `shared/src/hooks/useDocuments.ts` with upload, list, download mutations

### Mobile Implementation for US1

- [ ] T087 [P] [US1] Create ChatInterface component in `mobile/components/chat/ChatInterface.tsx` using React Native Paper
- [ ] T088 [P] [US1] Create DocumentGenerationDialog in `mobile/components/documents/DocumentGenerationDialog.tsx`
- [ ] T089 [P] [US1] Create DocumentList in `mobile/components/documents/DocumentList.tsx`
- [ ] T090 [US1] Create home screen in `mobile/app/(tabs)/index.tsx` with chat interface
- [ ] T091 [US1] Create documents screen in `mobile/app/(tabs)/documents.tsx` with generated documents list
- [ ] T092 [US1] Import shared useChat hook from `@shared/hooks/useChat`
- [ ] T093 [US1] Import shared useDocuments hook from `@shared/hooks/useDocuments`

**Checkpoint**: US1 complete — lawyers can query legal documents, get AI analysis, generate bail applications

---

## Phase 5: User Story 10 — Chat Interface Polish (Priority: P2)

**Goal**: Polished chat experience with conversation history

**Duration**: Week 5 (Days 29-35)

**Independent Test**: Open chat, ask multiple questions, verify context maintained, confirm history persists

### Implementation for US10

- [ ] T094 [US10] Enhance chat service in `backend/src/services/chat.py` to support: session archiving after 30 days, session listing with auto-generated titles
- [ ] T095 [US10] Enhance ChatInterface component in `frontend/src/components/chat/ChatInterface.tsx` with session selector dropdown, new session button, session history panel
- [ ] T096 [US10] Enhance mobile ChatInterface in `mobile/components/chat/ChatInterface.tsx` with session management, pull-to-refresh

**Checkpoint**: US10 complete — polished chat experience with persistent history

---

## Phase 6: User Story 3 — Admin Role Management (Priority: P2)

**Goal**: Root Admin can create/edit lawyer role

**Duration**: Week 5 (Days 29-35)

**Independent Test**: Admin creates lawyer role, uploads documents, assigns to test user

### Backend Implementation for US3

- [ ] T097 [US3] Create role management service in `backend/src/services/admin/role_service.py` with create_role, update_role, list_roles (lawyers only for MVP)
- [ ] T098 [US3] Create admin API router in `backend/src/api/v1/admin.py` with endpoints: POST `/admin/roles`, GET `/admin/roles`, PATCH `/admin/roles/{id}`, POST `/admin/roles/{id}/documents` (batch upload)

### Frontend Implementation for US3

- [ ] T099 [P] [US3] Create RoleManager component in `frontend/src/components/admin/RoleManager.tsx` with role creation form (name, display_name, category, AI persona textarea, sidebar features array editor)
- [ ] T100 [P] [US3] Create admin layout in `frontend/src/app/(admin)/layout.tsx` with admin-specific sidebar navigation (Users, Roles, Documents)
- [ ] T101 [US3] Create role management page in `frontend/src/app/(admin)/roles/page.tsx` with roles list, create/edit forms, document upload area

**Checkpoint**: US3 complete — Root Admin can manage lawyer role

---

## Phase 7: User Story 5 — HITL Document Approval (Priority: P2)

**Goal**: Root Admin can approve user-uploaded documents

**Duration**: Week 6 (Days 36-42)

**Independent Test**: Upload document as user, verify it appears in admin pending queue, approve as admin, confirm it becomes searchable

### Backend Implementation for US5

- [ ] T102 [US5] Create document review service in `backend/src/services/admin/document_review.py` with approve, reject, list_pending functions
- [ ] T103 [US5] Enhance admin API router in `backend/src/api/v1/admin.py` with endpoints: GET `/admin/documents/pending`, POST `/admin/documents/{id}/approve`, POST `/admin/documents/{id}/reject`
- [ ] T104 [US5] Create AI document analyzer in `backend/src/services/ai/document_analyzer.py` that extracts metadata (title, category, relevant sections) and generates quality score (0-100)

### Frontend Implementation for US5

- [ ] T105 [P] [US5] Create DocumentReview component in `frontend/src/components/admin/DocumentReview.tsx` with pending documents list, AI-generated summary display, approve/reject buttons
- [ ] T106 [US5] Create document review page in `frontend/src/app/(admin)/documents/page.tsx` with pending queue, filters, bulk actions

**Checkpoint**: US5 complete — HITL document approval working

---

## Phase 8: Subscription UI (Test Mode Only)

**Goal**: Show subscription UI for demo purposes (no real payments)

**Duration**: Week 6 (Days 36-42)

**Note**: This is UI ONLY for investor demo. No real payment processing.

### Backend Implementation (Minimal)

- [ ] T107 Create SubscriptionPlan model in `backend/src/models/subscription.py` with plan_id, role_id, tier, monthly_price, features (JSON)
- [ ] T108 Create subscription API router in `backend/src/api/v1/subscriptions.py` with endpoints: GET `/subscriptions/plans` (returns mock plans), GET `/subscriptions/current` (returns trial status)

### Frontend Implementation

- [ ] T109 [P] Create PricingTable component in `frontend/src/components/subscription/PricingTable.tsx` with 3-tier display (Basic/Pro/Premium), feature comparison
- [ ] T110 [P] Create subscription page in `frontend/src/app/(dashboard)/subscription/page.tsx` with pricing table, "Upgrade" button (shows "Coming in Checkpoint 2" message)
- [ ] T111 [P] Create mobile subscription screen in `mobile/app/(tabs)/subscription.tsx` with pricing table

**Checkpoint**: Subscription UI complete (test mode only)

---

## Phase 9: Testing & Demo Preparation

**Goal**: End-to-end testing, demo video, investor materials

**Duration**: Week 6 (Days 36-42)

### Testing Tasks

- [ ] T112 Test email signup flow (web + mobile) with 5 test users
- [ ] T113 Test phone OTP signup flow (web + mobile) with 5 test users
- [ ] T114 Test Google OAuth signup flow (web + mobile) with 5 test users
- [ ] T115 Test RAG queries with 20 legal questions (verify citations, confidence scores)
- [ ] T116 Test bail application generation with 10 different cases
- [ ] Test document upload and admin approval workflow
- [ ] T117 Test chat history persistence across sessions
- [ ] T118 Test mobile app on iOS (Expo Go) and Android (Expo Go)
- [ ] T119 Verify all free tier limits (Supabase 500MB, Upstash 10k commands, Gemini 15 RPM)

### Demo Preparation

- [ ] T120 Seed database with 50-100 legal documents (PPC, CrPC sections, case law)
- [ ] T121 Create 10-20 test lawyer accounts with sample data
- [ ] T122 Record demo video (3-5 minutes): signup → login → query → generate document → admin approval
- [ ] T123 Deploy to Vercel production (custom domain if available)
- [ ] T124 Generate Expo Go QR code for mobile demo
- [ ] T125 Create investor pitch deck (problem, solution, demo, ask, roadmap)
- [ ] T126 Prepare demo script with talking points

**Checkpoint**: MVP complete and ready for investor demo

---

## Deployment Checklist

### Vercel Deployment (Web + Backend)

- [ ] T127 Connect GitHub repository to Vercel
- [ ] T128 Configure environment variables in Vercel dashboard (Supabase URL/Key, Gemini API key, JWT secret, Google OAuth)
- [ ] T129 Deploy frontend (Next.js) to Vercel
- [ ] T130 Deploy backend (FastAPI serverless functions) to Vercel
- [ ] T131 Verify health check endpoint (`/health`) returns 200
- [ ] T132 Test API endpoints from Vercel domain

### Supabase Configuration

- [ ] T133 Create Supabase Free project
- [ ] T134 Run migrations (create tables: users, roles, admins, documents, chat_sessions, generated_documents)
- [ ] T135 Enable pgvector extension
- [ ] T136 Configure RLS policies for all tables
- [ ] T137 Seed database with lawyer role and Root Admin user
- [ ] T138 Upload 50-100 legal documents and generate embeddings

### Upstash Redis Configuration

- [ ] T139 Create Upstash Redis Free database
- [ ] T140 Configure connection in backend
- [ ] T141 Test cache read/write operations

### Mobile App (Expo Go)

- [ ] T142 Build mobile app with Expo CLI
- [ ] T143 Generate Expo Go QR code
- [ ] T144 Test on iOS device (scan QR code)
- [ ] T145 Test on Android device (scan QR code)

---

## Success Criteria (Checkpoint 1)

- [ ] ✅ User can sign up with email/phone/Google on web and mobile
- [ ] ✅ User can ask legal questions and get RAG responses with citations
- [ ] ✅ User can generate bail application document (.docx)
- [ ] ✅ Admin can approve user-uploaded documents
- [ ] ✅ Mobile app works via Expo Go (iOS + Android)
- [ ] ✅ Chat history persists across sessions
- [ ] ✅ Subscription UI displays (test mode)
- [ ] ✅ Demo video completed (3-5 minutes)
- [ ] ✅ 10-20 test users with sample data
- [ ] ✅ 50-100 legal documents in vector DB
- [ ] ✅ All services within free tier limits
- [ ] ✅ Deployed to Vercel with custom domain
- [ ] ✅ Ready to show investors

---

## Task Summary

**Total Tasks**: 145 (Checkpoint 1 MVP)

**By Phase**:
- Phase 1 (Setup): 14 tasks
- Phase 2 (Foundational): 26 tasks
- Phase 3 (US0 - Auth): 22 tasks
- Phase 4 (US1 - RAG): 31 tasks
- Phase 5 (US10 - Chat Polish): 3 tasks
- Phase 6 (US3 - Admin Roles): 5 tasks
- Phase 7 (US5 - HITL): 5 tasks
- Phase 8 (Subscription UI): 5 tasks
- Phase 9 (Testing & Demo): 15 tasks
- Deployment: 19 tasks

**By User Story**:
- US0 (Auth): 22 tasks
- US1 (RAG + Document Gen): 31 tasks
- US10 (Chat): 3 tasks
- US3 (Admin Roles): 5 tasks
- US5 (HITL): 5 tasks
- Infrastructure: 40 tasks
- Testing & Deployment: 34 tasks

**Parallel Opportunities**:
- Phase 1: 11 tasks can run in parallel
- Phase 2: 17 tasks can run in parallel
- Phase 3: 15 tasks can run in parallel (backend, frontend, mobile)
- Phase 4: 20 tasks can run in parallel

**Timeline**: 6 weeks (42 days)
- Week 1: Setup + Foundational (40 tasks)
- Week 2: US0 Authentication (22 tasks)
- Week 3-4: US1 RAG + Document Gen (31 tasks)
- Week 5: US10 + US3 (8 tasks)
- Week 6: US5 + Subscription UI + Testing + Demo (25 tasks)

---

**Next Step**: Begin implementation with Phase 1 (Setup)

**Cost**: PKR 0 ($0/month) - All free tiers

**Deliverable**: Working MVP for investor demo
