# Implementation Plan: Domain-Adaptive Multi-Tenant Agentic Platform

**Branch**: `001-domain-adaptive-platform` | **Date**: 2026-03-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-domain-adaptive-platform/spec.md`

**Note**: This template is filled in by the `/sp.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

A unified SaaS platform serving multiple professional domains (Lawyers, Teachers, Doctors, Engineers, Officers) in Pakistan through a single agentic system with role-based RAG, subscription management (Basic/Pro/Premium tiers), payment gateway integration (JazzCash, EasyPaisa, Stripe), and premium add-ons (Medical Exam Prep).

**Development Strategy**: 3-Checkpoint Progressive Deployment
- **Checkpoint 1 (Weeks 1-6)**: Free MVP for investors - lawyers domain only, $0/month
- **Checkpoint 2 (Months 2-7)**: Investor pilot - 2-3 domains, app stores, real revenue, $500-800/month
- **Checkpoint 3 (Months 8-18)**: Full scale - 5+ domains, 1000+ users, profitable, $1,500-2,500/month

**See**: [checkpoints.md](./checkpoints.md) for detailed roadmap

**Core Technical Approach**:
- Single unified agent with dynamic role context injection (not separate agents per profession)
- Multi-provider AI (Gemini primary, OpenAI backup) with automatic failover
- Three authentication methods: Email/password, Phone OTP, or Google OAuth (user chooses one)
- Subscription-based monetization with role-specific pricing and configurable free trials
- Progressive scaling: Free tiers → Managed services → Kubernetes
- Multi-level admin hierarchy (Root, Domain, Payment, Security, Content, Support admins)

## Technical Context

**Current Checkpoint**: Checkpoint 1 - Free MVP (Weeks 1-6)

**Language/Version**: Python 3.11 (Backend), TypeScript 5.x (Frontend Web & Mobile)

**Primary Dependencies (Checkpoint 1 - Free Stack)**:
- Backend: Vercel Serverless Functions (Free: 100GB bandwidth, 100 hours compute)
- Database: Supabase Free (500MB PostgreSQL + pgvector, 2GB bandwidth)
- Cache: Upstash Redis Free (10,000 commands/day)
- Storage: Supabase Storage Free (1GB)
- AI: Gemini 1.5 Flash Free Tier (15 RPM, 1M tokens/day)
- Frontend Web: Next.js 14 on Vercel Free
- Frontend Mobile: Expo SDK 50+ (Expo Go for development, no app stores yet)
- Shared: TanStack Query, Zustand, TypeScript 5.x, npm workspaces for code sharing
- Payments: Stripe Test Mode (UI only, no real transactions)

**Future Checkpoints**:
- Checkpoint 2: Railway/Render + Supabase Pro + Expo EAS ($500-800/month)
- Checkpoint 3: DigitalOcean Kubernetes + Managed services ($1,500-2,500/month)

**Testing**:
- Backend: pytest, pytest-asyncio, httpx (API testing)
- Frontend Web: Vitest, React Testing Library, Playwright (E2E)
- Frontend Mobile: Jest, React Native Testing Library
- Contract: Pydantic model validation, OpenAPI schema validation

**Target Platform**:
- Backend: Vercel Serverless (Node.js runtime for Python via adapter)
- Frontend Web: Web browsers (Chrome, Safari, Firefox), responsive design
- Frontend Mobile: iOS 13+ / Android 8+ via Expo Go (development builds)
- Deployment: Vercel CLI for backend/frontend, Expo CLI for mobile

**Project Type**: Multi-platform application (Serverless API + Web SPA + Mobile App)

**Performance Goals (Checkpoint 1 - MVP)**:
- API response time: <1s p95 (acceptable for demo, free tier limits)
- RAG query latency: <10 seconds for 95% of queries (Gemini free tier)
- Document generation: <15 seconds from field collection to .docx file
- Concurrent users: 10-20 max (free tier constraint)
- Cache hit rate: 30%+ for common queries (Upstash free tier)

**Performance Goals (Checkpoint 2 - Pilot)**:
- API response time: <500ms p95
- RAG query latency: <5 seconds for 95% of queries
- Document generation: <10 seconds
- Concurrent users: 100-500
- Cache hit rate: 40%+

**Performance Goals (Checkpoint 3 - Full Scale)**:
- API response time: <300ms p95
- RAG query latency: <3 seconds for 95% of queries
- Document generation: <8 seconds
- Concurrent users: 1000+
- Cache hit rate: 50%+

**Constraints (Checkpoint 1 - MVP)**:
- Cost: $0/month (all free tiers)
- Single domain: Lawyers only
- Documents: 100 max in vector DB (500MB Supabase limit)
- AI queries: 15 requests/minute (Gemini free tier)
- No real payments: Stripe test mode only
- No app stores: Expo Go development builds only

**Constraints (Checkpoint 2 - Pilot)**:
- Cost: $500-800/month
- 2-3 domains: Lawyers, Doctors, Teachers
- Real payments: Stripe, JazzCash, EasyPaisa
- App stores: iOS + Android
- 100-500 users

**Constraints (Checkpoint 3 - Full Scale)**:
- Cost: $1,500-2,500/month
- 5+ domains: All professional roles
- Enterprise features: SSO, white-label, API access
- 1000+ users
- Auto-scaling infrastructure

**Scale/Scope (Progressive)**:
- Checkpoint 1: 10-20 test users, 1 domain (lawyers), 100 documents
- Checkpoint 2: 100-500 users, 2-3 domains, 1000+ documents
- Checkpoint 3: 1000+ users, 5+ domains, unlimited documents

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Multi-Tenant Security First (NON-NEGOTIABLE)

**Status**: ✅ PASS

**Implementation**:
- Row-Level Security (RLS) policies on all tables containing user/tenant data
- All queries filtered by `tenant_id` at database level
- JWT authentication with Supabase Auth (email/password, phone OTP, Google OAuth)
- Audit logging for all data access attempts

**Test Plan**:
- [ ] RLS policies exist for: users, subscriptions, documents, payments, chat_sessions, exam_attempts
- [ ] Integration tests verify cross-tenant isolation (User A cannot access User B's data)
- [ ] All API endpoints validate JWT and extract tenant_id before queries
- [ ] Audit logs capture tenant_id, user_id, action, timestamp

### Principle II: Hallucination Prevention (NON-NEGOTIABLE)

**Status**: ✅ PASS

**Implementation**:
- RAG confidence threshold: 0.75 minimum for legal/professional content
- Explicit "I cannot find this in the official records" response when confidence < 0.75
- All AI-generated content includes source document citations
- Multi-provider failover maintains hallucination prevention across providers

**Test Plan**:
- [ ] Test queries for non-existent laws/policies return "cannot find" (not fabricated content)
- [ ] Generated documents include footnotes with RAG source references
- [ ] System logs all "cannot find" responses for knowledge gap analysis
- [ ] Confidence scores logged for all RAG retrievals

### Principle III: Human-In-The-Loop (HITL) for Professional Knowledge

**Status**: ✅ PASS

**Implementation**:
- All user-uploaded documents default to `status='pending'`
- Admin dashboard for document review with AI-generated summaries
- Approval workflow: pending → approved (queryable) or rejected (with reason)
- Pending documents NOT queryable by RAG system

**Test Plan**:
- [ ] Uploaded documents have status='pending' and are NOT in RAG results
- [ ] Admin can approve/reject with reason
- [ ] Approved documents trigger embedding generation and become searchable
- [ ] Audit trail logs admin_id, timestamp, action for all approvals/rejections

### Principle IV: Strict Typing and API Contracts

**Status**: ✅ PASS

**Implementation**:
- All FastAPI endpoints use Pydantic V2 models for request/response
- TypeScript interfaces for frontend (Next.js)
- OpenAPI schema auto-generated from Pydantic models
- Contract tests verify request/response shapes
- Complete API contracts defined in contracts/ directory (auth.yaml, subscriptions.yaml, documents.yaml, rag.yaml, admin.yaml, exam_prep.yaml)

**Test Plan**:
- [ ] All API routes have explicit Pydantic request/response models
- [ ] TypeScript types generated from Pydantic schemas (use datamodel-code-generator)
- [ ] Contract tests verify API matches OpenAPI schema
- [ ] CI fails on TypeScript `any` types in API client code

### Principle V: Cost-Conscious Architecture

**Status**: ✅ PASS (Checkpoint 1), ⚠️ MODIFIED (Checkpoint 2+)

**Checkpoint 1 Implementation (FREE - $0/month)**:
- Vercel Serverless Functions Free (100GB bandwidth, 100 hours compute)
- Supabase Free (500MB DB, 2GB bandwidth)
- Upstash Redis Free (10,000 commands/day)
- Supabase Storage Free (1GB)
- Gemini 1.5 Flash Free (15 RPM, 1M tokens/day)
- Vercel Free (unlimited deployments)
- Expo Go (development builds, no app stores)
- Stripe Test Mode (no real transactions)

**Checkpoint 2 Implementation (PAID - $500-800/month)**:
- Railway/Render ($20-25/month)
- Supabase Pro ($25/month)
- Upstash Redis Pay-as-you-go ($10/month)
- Gemini Pro + OpenAI backup ($100-200/month)
- Expo EAS ($29/month)
- App Store fees ($10/month)
- Email/SMS ($70/month)
- Payment gateway fees ($50-100/month)

**Checkpoint 3 Implementation (PRODUCTION - $1,500-2,500/month)**:
- DigitalOcean Kubernetes ($119/month base + nodes)
- Managed PostgreSQL ($60/month)
- Managed Redis ($15/month)
- Spaces storage ($5/month)
- AI APIs ($400-800/month)
- Expo EAS Pro ($99/month)
- Monitoring/Support ($200/month)

**Justification for Checkpoint 2+ Deviation**:
- Free tiers insufficient for production multi-tenant SaaS with 100+ users
- Managed services cheaper than AWS/GCP at this scale
- Cost optimization: query caching (40%), AI model routing (60%)
- Revenue model justifies costs: $500-2,000/month revenue vs $500-800/month cost

**Test Plan**:
- [ ] Checkpoint 1: Verify all services stay within free tier limits
- [ ] Checkpoint 2: Monitor costs, alert at 80% of $800/month budget
- [ ] Checkpoint 3: Monitor costs, alert at 80% of $2,500/month budget
- [ ] Track cache hit rate (target: 30% CP1, 40% CP2, 50% CP3)
- [ ] Track AI model usage per tier

### Principle VI: Domain-Specific Knowledge Boundaries

**Status**: ✅ PASS

**Implementation**:
- Role-based RAG filtering: users query only documents matching their role's category
- Dynamic role system: admin creates roles with category, AI persona, document templates
- Document formatting per domain: Legal (8.5" x 14"), Education (A4), Healthcare (PMC standards)
- Pakistani-specific sources prioritized in RAG

**Test Plan**:
- [ ] RAG queries filtered by role.category (lawyers see only legal documents)
- [ ] Cross-domain queries return zero results (teacher cannot access legal content)
- [ ] Generated documents match domain-specific formatting standards
- [ ] Test suite includes Pakistani-specific queries (e.g., "Section 302 PPC bail conditions")

### Principle VII: Stateful Agentic Workflows

**Status**: ✅ PASS

**Implementation**:
- LangGraph for multi-step workflows (document generation, case analysis)
- Workflow state persisted to database (enables resume after interruption)
- Missing required fields trigger clarification requests (not placeholder text)
- Each workflow node has explicit success/failure conditions
- Document generation workflow defined in services/workflows/document_gen.py
- Case analysis workflow defined in services/workflows/case_analysis.py
- Exam test workflow defined in services/workflows/exam_test.py

**Test Plan**:
- [ ] Workflow state persisted after each node
- [ ] Integration tests verify end-to-end workflows with missing data scenarios
- [ ] Workflows validate all required fields before document generation
- [ ] Failed workflows logged with node transitions and input/output snapshots

### Overall Gate Status

**Checkpoint 1 (Free MVP)**: ✅ PASS
- All 7 principles compliant with free tier stack
- Single domain (lawyers) reduces complexity
- Subscription UI only (no real payments)
- Expo Go (no app store deployment)
- Cost: $0/month

**Checkpoint 2 (Investor Pilot)**: ✅ PASS with justification
- Principle V modified (paid services $500-800/month)
- Multi-admin system added
- Real payments integrated
- App stores deployment
- 2-3 domains operational

**Checkpoint 3 (Full Scale)**: ✅ PASS with justification
- Principle V modified (paid services $1,500-2,500/month)
- Advanced admin system (6 admin types)
- Enterprise features
- 5+ domains operational
- Auto-scaling infrastructure

**Action Required**:
1. Review checkpoints.md for detailed roadmap
2. Update tasks.md for Checkpoint 1 scope (lawyers only, no payments)
3. Begin implementation with Checkpoint 1

## Project Structure

### Documentation (this feature)

```text
specs/001-domain-adaptive-platform/
├── plan.md              # This file (implementation plan)
├── checkpoints.md       # 3-checkpoint development roadmap (NEW)
├── spec.md              # Feature specification
├── tasks.md             # All tasks (219 tasks for full scale)
├── tasks-checkpoint1.md # Checkpoint 1 tasks only (MVP - to be created)
├── tasks-checkpoint2.md # Checkpoint 2 tasks only (Pilot - to be created)
├── tasks-checkpoint3.md # Checkpoint 3 tasks only (Full Scale - to be created)
├── research.md          # Phase 0 research
├── data-model.md        # Database schema
├── quickstart.md        # Setup guide
└── contracts/           # API contracts
    ├── openapi.yaml     # OpenAPI 3.1 schema
    ├── auth.yaml        # Authentication endpoints
    ├── subscriptions.yaml # Subscription management endpoints
    ├── documents.yaml   # Document generation endpoints
    ├── rag.yaml         # RAG query endpoints
    ├── admin.yaml       # Admin dashboard endpoints
    └── exam_prep.yaml   # Exam prep endpoints
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── api/
│   │   ├── v1/
│   │   │   ├── auth.py           # Email/phone/OAuth endpoints
│   │   │   ├── subscriptions.py  # Subscription CRUD, payment webhooks
│   │   │   ├── documents.py      # Document generation workflows
│   │   │   ├── rag.py            # RAG query endpoints
│   │   │   ├── admin.py          # Admin dashboard, role management
│   │   │   └── exam_prep.py      # Medical exam prep MCQs
│   │   ├── middleware.py         # JWT validation, rate limiting, CORS
│   │   └── dependencies.py       # FastAPI dependencies (auth, DB)
│   ├── models/
│   │   ├── user.py               # User, UserProfile, AuthMethod
│   │   ├── subscription.py       # Subscription, SubscriptionPlan, PaymentTransaction
│   │   ├── role.py               # Role, DocumentTemplate
│   │   ├── document.py           # Document, Contribution, GeneratedDocument
│   │   ├── exam.py               # ExamQuestion, ExamAttempt
│   │   └── audit.py              # AuditLog, QueryCache
│   ├── services/
│   │   ├── auth/
│   │   │   ├── email_auth.py     # Email/password + verification
│   │   │   ├── phone_auth.py     # Phone OTP via SMS gateway
│   │   │   └── oauth.py          # Google OAuth integration
│   │   ├── payments/
│   │   │   ├── stripe.py         # Stripe card payments
│   │   │   ├── jazzcash.py       # JazzCash mobile wallet
│   │   │   └── easypaisa.py      # EasyPaisa mobile wallet
│   │   ├── ai/
│   │   │   ├── provider.py       # Multi-provider abstraction
│   │   │   ├── gemini.py         # Gemini 1.5 Flash/Pro
│   │   │   ├── openai.py         # OpenAI GPT-4o/mini
│   │   │   ├── failover.py       # Automatic failover logic
│   │   │   └── router.py         # Model routing by complexity/tier
│   │   ├── rag/
│   │   │   ├── embeddings.py     # text-embedding-004
│   │   │   ├── retrieval.py      # pgvector similarity search
│   │   │   ├── cache.py          # Query cache with Redis
│   │   │   └── chunking.py       # Document chunking strategy
│   │   ├── workflows/
│   │   │   ├── document_gen.py   # LangGraph document generation
│   │   │   ├── case_analysis.py  # Legal case analysis workflow
│   │   │   └── exam_test.py      # Timed exam workflow
│   │   └── notifications/
│   │       ├── email.py          # Email alerts (SMTP)
│   │       └── slack.py          # Slack webhook integration
│   ├── db/
│   │   ├── migrations/           # Alembic migrations
│   │   ├── rls_policies.sql      # Row-Level Security policies
│   │   └── session.py            # Database session management
│   └── config.py                 # Environment configuration
├── tests/
│   ├── unit/
│   │   ├── test_auth.py
│   │   ├── test_payments.py
│   │   ├── test_ai_failover.py
│   │   └── test_rag_cache.py
│   ├── integration/
│   │   ├── test_api_auth.py
│   │   ├── test_subscription_flow.py
│   │   ├── test_document_generation.py
│   │   └── test_rls_policies.py
│   └── e2e/
│       ├── test_signup_to_subscription.py
│       └── test_document_workflow.py
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
└── pyproject.toml

frontend/
├── src/
│   ├── app/                      # Next.js 14 App Router
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   ├── signup/
│   │   │   └── verify/
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx        # Dashboard layout with sidebar
│   │   │   ├── page.tsx          # Main dashboard
│   │   │   ├── chat/             # Chat interface
│   │   │   ├── documents/        # Generated documents list
│   │   │   ├── subscription/     # Subscription management
│   │   │   └── exam-prep/        # Medical exam prep (conditional)
│   │   ├── (admin)/
│   │   │   ├── users/
│   │   │   ├── roles/
│   │   │   ├── documents/        # Pending document review
│   │   │   ├── pricing/
│   │   │   └── analytics/
│   │   └── api/                  # API routes (webhooks)
│   ├── components/
│   │   ├── ui/                   # shadcn/ui components
│   │   ├── auth/
│   │   │   ├── EmailSignup.tsx
│   │   │   ├── PhoneSignup.tsx
│   │   │   └── GoogleOAuth.tsx
│   │   ├── chat/
│   │   │   ├── ChatInterface.tsx
│   │   │   ├── MessageList.tsx
│   │   │   └── InputBox.tsx
│   │   ├── subscription/
│   │   │   ├── PricingTable.tsx
│   │   │   ├── PaymentForm.tsx
│   │   │   └── UsageIndicator.tsx
│   │   └── admin/
│   │       ├── DocumentReview.tsx
│   │       ├── RoleManager.tsx
│   │       └── PricingEditor.tsx
│   ├── lib/
│   │   ├── api-client.ts         # API client with types
│   │   ├── auth.ts               # Auth helpers
│   │   └── utils.ts              # Utility functions
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useChat.ts
│   │   ├── useSubscription.ts
│   │   └── useDocuments.ts
│   ├── stores/
│   │   ├── authStore.ts          # Zustand auth state
│   │   └── chatStore.ts          # Zustand chat state
│   └── types/
│       ├── api.ts                # Generated from Pydantic
│       └── models.ts             # Frontend-specific types
├── tests/
│   ├── unit/
│   └── e2e/                      # Playwright tests
├── public/
├── package.json
├── tsconfig.json
└── tailwind.config.ts

mobile/
├── app/                        # Expo Router (file-based routing)
│   ├── (auth)/
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   └── verify.tsx
│   ├── (tabs)/                 # Bottom tab navigation
│   │   ├── _layout.tsx         # Tab layout
│   │   ├── index.tsx           # Home/Dashboard
│   │   ├── chat.tsx            # Chat interface
│   │   ├── documents.tsx       # Documents list
│   │   ├── subscription.tsx    # Subscription management
│   │   └── exam-prep.tsx       # Medical exam prep (conditional)
│   ├── (admin)/
│   │   ├── users.tsx
│   │   ├── roles.tsx
│   │   ├── documents.tsx       # Pending document review
│   │   ├── pricing.tsx
│   │   └── analytics.tsx
│   ├── _layout.tsx             # Root layout
│   └── +not-found.tsx
├── components/
│   ├── auth/
│   │   ├── EmailSignup.tsx
│   │   ├── PhoneSignup.tsx
│   │   └── GoogleOAuth.tsx
│   ├── chat/
│   │   ├── ChatInterface.tsx
│   │   ├── MessageList.tsx
│   │   └── InputBox.tsx
│   ├── subscription/
│   │   ├── PricingTable.tsx
│   │   ├── PaymentForm.tsx
│   │   └── UsageIndicator.tsx
│   └── ui/                     # React Native Paper components
├── hooks/
│   ├── useAuth.ts              # Shared with web
│   ├── useChat.ts              # Shared with web
│   ├── useSubscription.ts      # Shared with web
│   └── useDocuments.ts         # Shared with web
├── lib/
│   ├── api-client.ts           # Shared with web
│   ├── auth.ts                 # Shared with web
│   └── utils.ts                # Shared with web
├── stores/
│   ├── authStore.ts            # Zustand (shared with web)
│   └── chatStore.ts            # Zustand (shared with web)
├── types/
│   ├── api.ts                  # Generated from Pydantic (shared)
│   └── models.ts               # Shared with web
├── tests/
│   ├── unit/
│   └── e2e/                    # Detox tests
├── app.json                    # Expo config
├── eas.json                    # Expo Application Services config
├── package.json
├── tsconfig.json
└── metro.config.js

infrastructure/
├── kubernetes/
│   ├── deployment.yaml           # Backend deployment
│   ├── service.yaml              # Load balancer service
│   ├── hpa.yaml                  # Horizontal Pod Autoscaler
│   ├── configmap.yaml            # Environment config
│   └── secrets.yaml              # Secrets (encrypted)
├── docker/
│   ├── backend.Dockerfile
│   └── frontend.Dockerfile
└── terraform/                    # DigitalOcean infrastructure
    ├── main.tf
    ├── kubernetes.tf
    ├── database.tf
    ├── redis.tf
    └── spaces.tf
```

**Structure Decision**: Multi-platform application with separate backend (FastAPI), web frontend (Next.js), and native mobile apps (Expo/React Native). Backend follows domain-driven structure with clear separation: API routes, business logic (services), data models, and infrastructure (DB, external APIs). Web frontend uses Next.js 14 App Router with feature-based organization. Mobile apps use Expo Router for file-based navigation with shared React hooks, API client, and Zustand stores between web and mobile. Infrastructure as code with Kubernetes manifests and Terraform for DigitalOcean resources.

**Code Sharing Strategy (Web ↔ Mobile)**: Use **npm workspaces** with monorepo structure to share TypeScript code between `frontend/` and `mobile/`. Create a `@shared/` workspace package containing:
- `@shared/hooks` - React hooks (useAuth, useChat, useSubscription, useDocuments)
- `@shared/stores` - Zustand stores (authStore, chatStore)
- `@shared/types` - TypeScript types generated from Pydantic models
- `@shared/api` - API client with typed fetch wrapper
- `@shared/utils` - Utility functions

**Implementation**:
1. Root `package.json` defines workspaces: `["frontend", "mobile", "shared"]`
2. Shared package at `shared/package.json` with exports: `{ "exports": { "./hooks": "./src/hooks/index.ts", "./stores": "./src/stores/index.ts", "./types": "./src/types/index.ts", "./api": "./src/api/index.ts", "./utils": "./src/utils/index.ts" } }`
3. Frontend imports: `import { useAuth } from '@shared/hooks'`
4. Mobile imports: `import { useAuth } from '@shared/hooks'` (same syntax)
5. Platform-specific overrides: Use conditional imports or platform detection within shared code (e.g., `Platform.OS === 'web'` vs `'ios'/'android'`)
6. Token storage: Shared hook with platform-specific adapters (localStorage for web, Expo SecureStore for mobile)

**Rationale**: npm workspaces provide type-safe code sharing without manual file copying or symlinks. Changes to shared code are immediately reflected in both platforms. TypeScript ensures type safety across boundaries. Alternative (symlinks) rejected because they're fragile across different OS environments and don't work well with Metro bundler (React Native).

## Complexity Tracking

**Status**: No unjustified violations

**Checkpoint Strategy Justification**:

The 3-checkpoint approach adds organizational complexity but is justified by:

| Decision | Why Needed | Simpler Alternative Rejected Because |
|----------|------------|-------------------------------------|
| 3-checkpoint progressive deployment | Enables investor funding at each stage, reduces upfront capital risk, validates product-market fit before scaling | Single deployment approach requires $21,000-34,800 upfront investment with no validation. Checkpoint approach allows: (1) $0 MVP to prove concept, (2) $3,000-4,800 pilot to prove traction, (3) $18,000-30,000 full scale only after revenue validation. |
| Multi-level admin hierarchy (6 types) | Enables delegation at scale, domain isolation, security separation, payment isolation | Single admin type requires Root Admin to handle all tasks (user management, document approval, payments, security) across all domains. At 1000+ users and 5+ domains, this becomes unmanageable. Domain Admins enable parallel operations. |
| Free tier stack for Checkpoint 1 | Zero cost enables investor demo without capital | Paid stack ($500/month) requires $3,000 investment before proving concept to investors. Free tier proves viability first. |

**Constitution Compliance by Checkpoint**:

**Checkpoint 1**: All 7 principles PASS (free tier, single domain, no payments)

**Checkpoint 2**: 6 principles PASS, 1 justified deviation:
- Principle V: Using paid services ($500-800/month) justified by revenue ($500-2,000/month) and user scale (100-500 users)

**Checkpoint 3**: 6 principles PASS, 1 justified deviation:
- Principle V: Using paid services ($1,500-2,500/month) justified by revenue ($5,000-10,000/month) and profit margin (50-75%)
