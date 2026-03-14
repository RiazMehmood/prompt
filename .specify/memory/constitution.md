# Multi-Profession Agentic SaaS Constitution

<!--
Sync Impact Report:
Version: 1.2.0 (Universal Multi-Profession Support)
Ratification Date: 2026-03-14
Last Amended: 2026-03-14

Modified Principles:
- Principle III: Expanded from "Legal Knowledge" to "Professional Knowledge" (all domains)
- Principle VI: Expanded from "Pakistani Legal Domain Specificity" to "Domain-Specific Knowledge Boundaries" (extensible to unlimited professions)

Added Sections: None (enhanced existing principles)
Removed Sections: None

Major Changes:
- Platform now supports unlimited professional roles through admin configuration
- Dynamic role system replaces fixed roles (lawyer, teacher, officer)
- Admin can create new roles with custom categories, AI personas, and document sets
- Constitution principles now apply universally across all professional domains

Templates Requiring Updates:
✅ spec-template.md - Updated for dynamic role system
✅ plan-template.md - Constitution Check section references this file
✅ tasks-template.md - Task categorization aligns with principles
⚠ Command files - No command files found in .specify/templates/commands/

Follow-up TODOs: None
-->

## Core Principles

### I. Multi-Tenant Security First (NON-NEGOTIABLE)

Every feature MUST enforce tenant isolation at the database level using Supabase Row Level Security (RLS). No data access without verified tenant context. All queries MUST include tenant_id filtering. Authentication tokens MUST be validated before any operation.

**Rationale**: In a legal SaaS platform handling sensitive case data, data leakage between tenants (law firms, courts) is catastrophic. RLS provides defense-in-depth at the database layer, preventing application-level bugs from exposing cross-tenant data.

**Testability Criteria**:
- [ ] RLS policies exist for every table containing tenant data
- [ ] Integration tests verify cross-tenant data isolation (User A cannot access User B's data)
- [ ] All API endpoints validate JWT and extract tenant_id before database queries
- [ ] Audit logs capture all data access attempts with tenant context

**Failure Modes to Prevent**:
- Direct SQL queries bypassing RLS (use Supabase client with auth context)
- Shared admin accounts accessing multiple tenants (require explicit tenant switching with audit trail)
- Missing tenant_id in JOIN queries (enforce in code review checklist)

### II. Hallucination Prevention (NON-NEGOTIABLE)

AI-generated legal content MUST be grounded in retrieved documents from the vector store. If a legal section, case law, or precedent cannot be found in the RAG system, the AI MUST explicitly state "I cannot find this in the official records" rather than generating plausible-sounding but incorrect legal text.

**Rationale**: Legal hallucinations can result in malpractice, dismissed cases, or professional sanctions. Pakistani legal practitioners depend on accurate citations to CrPC, PPC, and Constitution of Pakistan. Confidence without accuracy is dangerous.

**Testability Criteria**:
- [ ] Every legal citation includes source document ID and retrieval confidence score
- [ ] System logs all "cannot find" responses for knowledge gap analysis
- [ ] Test suite includes queries for non-existent laws (must return "cannot find", not fabricated content)
- [ ] Generated documents include footnotes with RAG source references

**Failure Modes to Prevent**:
- LLM generating legal text when RAG returns no results (enforce retrieval check before generation)
- Mixing retrieved facts with LLM-generated "filler" text (use structured templates with explicit RAG slots)
- Low-confidence retrievals treated as authoritative (set minimum similarity threshold: 0.75)

### III. Human-In-The-Loop (HITL) for Professional Knowledge

All user-contributed documents (legal case law, educational materials, government policies, drafting samples) MUST go through admin review before being added to the vector database. The system provides AI-assisted summarization and metadata extraction, but final approval requires human judgment.

**Rationale**: Knowledge quality directly impacts professional outcomes across all domains. Unverified or misclassified documents pollute the RAG system and degrade all future responses. Admin review ensures only authoritative, properly categorized materials enter the knowledge base, whether legal precedents, curriculum-aligned textbooks, or official government acts.

**Testability Criteria**:
- [ ] Uploaded documents default to `status: 'pending'` and are NOT queryable by RAG
- [ ] Admin dashboard shows pending documents with AI-extracted metadata for review
- [ ] Approval action moves document to `status: 'approved'` and triggers embedding generation
- [ ] Rejection action stores reason and notifies uploader

**Failure Modes to Prevent**:
- Auto-approval bypassing human review (no automated status changes to 'approved')
- Pending documents leaking into RAG results (filter by status in vector queries)
- Missing audit trail for approvals/rejections (log admin_id, timestamp, reason)

### IV. Strict Typing and API Contracts

All FastAPI endpoints MUST use Pydantic models for request/response validation. Mobile (Expo) and Web (Next.js) clients MUST have TypeScript interfaces generated from these models. No implicit data structures or "any" types in client code.

**Rationale**: Multi-platform development (Web + Mobile) requires ironclad contracts. Type mismatches cause runtime crashes in production. Pydantic validation catches malformed requests at the API boundary, preventing downstream errors in LangGraph workflows.

**Testability Criteria**:
- [ ] All FastAPI routes have explicit Pydantic request/response models
- [ ] TypeScript types auto-generated from Pydantic schemas (use `pydantic-to-typescript` or similar)
- [ ] Contract tests verify request/response shape matches Pydantic models
- [ ] CI fails on TypeScript `any` types in API client code

**Failure Modes to Prevent**:
- Manual TypeScript type definitions drifting from Pydantic models (automate generation)
- Optional fields causing undefined errors (use strict null checks in TypeScript)
- Enum mismatches between backend and frontend (generate enums from single source)

### V. Cost-Conscious Architecture

All infrastructure MUST run on free tiers: Supabase Free (500MB DB, 50MB file storage), Render Free (750 hours/month), Gemini 1.5 Flash or Groq (free API tiers). Paid services require explicit justification and user approval.

**Rationale**: Early-stage legal tech in Pakistan cannot assume venture funding. Free-tier constraints force architectural discipline (efficient embeddings, query optimization, caching) that scales better than throwing money at infrastructure.

**Testability Criteria**:
- [ ] Monitoring dashboard tracks free-tier usage (DB size, API calls, bandwidth)
- [ ] Alerts trigger at 80% of free-tier limits
- [ ] Embedding strategy uses efficient models (e.g., text-embedding-3-small: 1536 dims)
- [ ] Query caching reduces redundant API calls (cache common legal queries)

**Failure Modes to Prevent**:
- Unoptimized embeddings exhausting storage (chunk size: 512 tokens max, overlap: 50 tokens)
- Redundant API calls to LLM (cache responses for identical queries with TTL: 24h)
- Large file uploads exceeding storage (enforce 10MB limit per document, compress PDFs)

### VI. Domain-Specific Knowledge Boundaries

All retrieval MUST prioritize domain-specific Pakistani sources based on user role:
- **Legal (lawyers, magistrates)**: Constitution of Pakistan, PPC, CrPC, Pakistani case law, court precedents
- **Education (teachers, students)**: Sindh Board, Punjab Board, Federal Board textbooks, exam papers, curriculum guides
- **Government (town officers, account officers)**: Local Government Acts, provincial policies, federal regulations, administrative procedures
- **Engineering (executive engineers)**: Building codes, engineering standards, project management guidelines, technical specifications
- **Healthcare (doctors)**: Medical protocols, pharmaceutical guidelines, healthcare regulations, clinical standards
- **Research (research scholars)**: Academic papers, research methodologies, citation standards, domain-specific literature

Document formatting MUST match domain standards:
- Legal: Legal size (8.5" x 14"), court-specific margins, citation format
- Education: A4, board-specific formatting, answer key structure
- Government: Official letterhead format, policy document structure
- Engineering: Technical drawing standards, specification formats
- Healthcare: Medical report formats, prescription standards
- Research: Academic paper formats (APA, IEEE, etc.)

**Rationale**: Generic AI trained on global data is insufficient for Pakistani professionals. Each domain has specific formatting requirements, terminology, and authoritative sources. The system must be a domain expert across multiple professional verticals, not a general-purpose assistant.

**Testability Criteria**:
- [ ] RAG metadata includes jurisdiction field (filter: jurisdiction='Pakistan')
- [ ] Document templates validated against actual court-accepted samples
- [ ] Test suite includes Pakistani-specific legal queries (e.g., "Section 302 PPC bail conditions")
- [ ] Generated documents match formatting: Legal size (8.5" x 14"), margins (1" top/bottom, 1.25" left/right)

**Failure Modes to Prevent**:
- US/UK legal precedents contaminating Pakistani queries (strict jurisdiction filtering in RAG)
- Incorrect document formatting causing court rejection (validate against official templates)
- Missing Urdu support for bilingual documents (UTF-8 encoding, Urdu fonts: Jameel Noori Nastaleeq)

### VII. Stateful Agentic Workflows

Complex legal tasks (bail application drafting, case research) MUST use LangGraph for stateful multi-step workflows. Each workflow node MUST have explicit success/failure conditions. Missing required data triggers clarification requests to the user, not placeholder text in generated documents.

**Rationale**: Legal document generation is not a single LLM call. A bail application requires: (1) analyzing the request, (2) identifying missing fields (father's name, police station), (3) retrieving relevant case law, (4) formatting per court rules. LangGraph makes this workflow explicit, debuggable, and resumable.

**Testability Criteria**:
- [ ] Each workflow node has unit tests for success/failure paths
- [ ] Workflow state persisted to database (enables resume after interruption)
- [ ] Integration tests verify end-to-end workflow with missing data scenarios
- [ ] Workflow visualization available for debugging (LangGraph's built-in graph rendering)

**Failure Modes to Prevent**:
- Workflows generating incomplete documents with placeholders (validate all required fields before generation)
- Non-resumable workflows losing progress on errors (persist state after each node)
- Unclear workflow failures (log node transitions with input/output snapshots)

## Technical Architecture Standards

### Database Design

- **Supabase Postgres with pgvector**: All embeddings stored in `vector(1536)` columns for semantic search
- **RLS Policies**: Every table with user data MUST have RLS enabled with policies checking `auth.uid()` or `tenant_id`
- **Metadata JSONB**: Legal document metadata (type: 'act'|'case_law'|'sample', section, court, date, jurisdiction) stored as JSONB for flexible querying
- **Status Enums**: Document approval workflow uses `status: 'pending'|'approved'|'rejected'` enum
- **Indexes**: Create GIN indexes on JSONB metadata fields and IVFFlat indexes on vector columns (lists=100 for <1M rows)
- **Audit Tables**: All data modifications logged to `audit_log` table (user_id, tenant_id, table_name, action, old_value, new_value, timestamp)

### API Design

- **FastAPI with Pydantic V2**: All endpoints use Pydantic models with `Field()` validators
- **LangGraph Integration**: Stateful workflows exposed as POST endpoints returning workflow state + next action
- **Error Taxonomy**: HTTP 400 (validation), 401 (auth), 403 (tenant isolation), 404 (not found), 422 (business logic), 500 (server error)
- **Idempotency**: Document generation endpoints use idempotency keys to prevent duplicate drafts
- **Rate Limiting**: Per-tenant rate limits (10 req/min for free tier) using Redis or in-memory cache
- **API Versioning**: URL-based versioning (`/api/v1/`) with deprecation notices for old versions

### Frontend Standards

- **Shared React Hooks**: `useChat`, `useDocumentUpload`, `useLegalSearch` work in both Next.js (Web) and Expo (Mobile)
- **Tailwind/NativeWind**: Shared styling system with platform-specific overrides only when necessary
- **Lucide Icons**: Use `lucide-react` (Web) and `lucide-react-native` (Mobile) with consistent icon names
- **TypeScript Strict Mode**: No `any` types, all API responses typed from Pydantic models
- **Error Boundaries**: Wrap all major components in error boundaries with user-friendly fallbacks
- **Offline Support**: Mobile app caches recent documents and queries for offline access (using AsyncStorage)

## Development Workflow

### Phase 0: Research & Discovery

- Verify Supabase free tier limits (500MB DB, 2GB bandwidth/month, 50MB file storage)
- Test Gemini 1.5 Flash API rate limits and context window (1M tokens, 15 RPM free tier)
- Research Pakistani court document formatting requirements (Legal size: 8.5" x 14", margins, fonts)
- Identify sample legal documents for RAG ingestion (PPC, CrPC, Constitution PDFs)
- Evaluate embedding models (text-embedding-3-small: 1536 dims, $0.02/1M tokens vs free alternatives)
- Document free-tier constraints and architectural workarounds

### Phase 1: Foundation (Blocking)

**CRITICAL**: No user story work can begin until this phase is complete.

- Setup Supabase project with RLS policies for all tables
- Create `profiles`, `documents`, `workflows`, `audit_log` tables with proper indexes
- Implement JWT authentication flow (Supabase Auth with email/password)
- Build document ingestion pipeline (PDF → text extraction → chunking → embeddings → pgvector)
- Create FastAPI base structure with Pydantic models and error handling
- Setup monitoring for free-tier usage (DB size, API calls, bandwidth)
- Configure CORS for Web (Next.js) and Mobile (Expo) origins

### Phase 2: User Stories (Independent)

Each user story (Bail Application, Case Research, Document Upload) implemented as independent LangGraph workflow with its own:
- Pydantic request/response models
- LangGraph workflow definition
- FastAPI endpoint
- React hooks (shared Web/Mobile)
- Integration tests
- UI components

**User stories can be developed in parallel once Foundation is complete.**

### Phase 3: Integration & Polish

- Cross-platform testing (Web + Mobile on iOS/Android)
- Performance optimization (query caching, embedding reuse, connection pooling)
- Admin dashboard for HITL document approval
- Usage tracking dashboard for free-tier monitoring
- Security audit (RLS policies, input validation, rate limiting)
- Documentation (API docs, user guides, deployment instructions)

## Quality Gates

### Before Any Code

- [ ] Constitution Check: Does this feature require tenant isolation? (If yes, RLS policy designed)
- [ ] Constitution Check: Does this feature generate legal content? (If yes, hallucination prevention strategy documented)
- [ ] Constitution Check: Does this feature add new API endpoints? (If yes, Pydantic models defined)
- [ ] Constitution Check: Does this feature impact free-tier limits? (If yes, usage optimization strategy documented)

### Before Deployment

- [ ] RLS policies tested with multiple tenant contexts (minimum 3 test tenants)
- [ ] AI responses tested with missing data (confirms "cannot find" behavior, not hallucination)
- [ ] Free-tier usage measured (DB size, API calls, bandwidth) and under 70% of limits
- [ ] Pakistani legal formatting validated (paper size, margins, citation format)
- [ ] Cross-platform testing completed (Web + Mobile on iOS/Android)
- [ ] Security checklist: SQL injection, XSS, CSRF, rate limiting, input validation
- [ ] Performance benchmarks: API response time <500ms p95, RAG query <2s

### Before Production Release

- [ ] Audit logging enabled for all data modifications
- [ ] Monitoring and alerting configured (free-tier usage, error rates, API latency)
- [ ] Backup strategy implemented (Supabase automatic backups enabled)
- [ ] Incident response plan documented (who to contact, rollback procedure)
- [ ] Legal disclaimer and terms of service reviewed by legal counsel

## Observability & Monitoring

### Logging Standards

- **Structured Logging**: All logs in JSON format with fields: timestamp, level, tenant_id, user_id, request_id, message, context
- **Log Levels**: DEBUG (development only), INFO (normal operations), WARN (recoverable errors), ERROR (failures requiring attention)
- **Sensitive Data**: Never log passwords, tokens, or full legal documents (log document_id only)
- **Retention**: Logs retained for 30 days (free-tier constraint)

### Metrics to Track

- **Business Metrics**: Documents generated per tenant, RAG queries per day, user signups, document approval rate
- **Technical Metrics**: API response time (p50, p95, p99), RAG retrieval latency, database query time, error rate
- **Resource Metrics**: Database size, file storage usage, API call count, bandwidth usage
- **Free-Tier Metrics**: Percentage of limits used (alert at 80%, block at 95%)

### Alerting Strategy

- **Critical Alerts** (immediate action): RLS policy violations, authentication failures spike, free-tier limit exceeded
- **Warning Alerts** (review within 24h): Error rate >5%, API latency >1s p95, free-tier usage >80%
- **Info Alerts** (weekly review): New tenant signups, document approval backlog >50

### Debugging Tools

- **Request Tracing**: Unique request_id propagated through all services (FastAPI → LangGraph → Supabase)
- **Workflow Visualization**: LangGraph state graphs exported for failed workflows
- **Query Explain**: Slow database queries (>100ms) logged with EXPLAIN ANALYZE output

## Security Standards

### Authentication & Authorization

- **Authentication**: Supabase Auth with JWT tokens (15-minute expiry, refresh tokens for 30 days)
- **Authorization**: Role-based access control (RBAC) with roles: user, lawyer, admin, super_admin
- **Password Policy**: Minimum 12 characters, must include uppercase, lowercase, number, special character
- **MFA**: Optional for users, mandatory for admins (TOTP-based)

### Data Protection

- **Encryption at Rest**: Supabase default encryption (AES-256)
- **Encryption in Transit**: HTTPS only (TLS 1.3), no HTTP fallback
- **PII Handling**: Legal names, case details, contact info treated as PII (GDPR-compliant deletion on request)
- **Data Retention**: User data retained until account deletion, audit logs retained for 1 year

### Input Validation

- **API Inputs**: All inputs validated by Pydantic models with strict types
- **File Uploads**: PDF only, max 10MB, virus scanning (ClamAV or VirusTotal API on free tier)
- **SQL Injection**: Use parameterized queries only (Supabase client handles this)
- **XSS Prevention**: Sanitize all user-generated content before rendering (DOMPurify for Web, React Native safe by default)

### Rate Limiting

- **Per-Tenant Limits**: 10 requests/minute for free tier, 100 requests/minute for paid tier
- **Per-IP Limits**: 100 requests/hour for unauthenticated endpoints (signup, login)
- **Document Generation**: 5 documents/hour per user (prevents abuse)
- **File Upload**: 10 uploads/day per user

## Testing Strategy

### Test Pyramid

- **Unit Tests** (70%): Individual functions, Pydantic models, utility functions
- **Integration Tests** (20%): API endpoints, LangGraph workflows, database operations
- **E2E Tests** (10%): Critical user journeys (signup → login → generate document → download)

### Test Coverage Requirements

- **Minimum Coverage**: 80% for backend (FastAPI, LangGraph), 70% for frontend (React hooks)
- **Critical Paths**: 100% coverage for RLS policies, authentication, hallucination prevention logic

### Test Data

- **Fixtures**: Sample Pakistani legal documents (PPC sections, bail application templates)
- **Synthetic Data**: Generated test tenants, users, documents (never use production data in tests)
- **Edge Cases**: Missing fields, malformed PDFs, non-existent legal sections, cross-tenant access attempts

### CI/CD Pipeline

- **Pre-Commit**: Linting (ruff for Python, ESLint for TypeScript), type checking (mypy, tsc)
- **PR Checks**: Unit tests, integration tests, type coverage, security scan (Bandit, npm audit)
- **Deployment**: E2E tests on staging, manual approval for production, automatic rollback on errors

## Governance

This constitution supersedes all other development practices. Any feature that violates these principles MUST be rejected or redesigned. Amendments require:

1. Documented rationale for the change
2. Impact analysis on existing features
3. Migration plan for affected code
4. Approval from project stakeholders

**Complexity Justification**: Any architectural decision that adds complexity (new service, new database, new framework) MUST justify why simpler alternatives are insufficient. Default to boring technology.

**Compliance Review**: All PRs MUST include a constitution checklist confirming adherence to Multi-Tenant Security, Hallucination Prevention, and Strict Typing principles.

**Amendment Process**:
1. Propose amendment with rationale in GitHub issue
2. Impact analysis: which features/code affected
3. Team review and discussion (minimum 3 business days)
4. Approval requires consensus from technical lead + product owner
5. Update constitution with new version number (semantic versioning)
6. Update all dependent templates and documentation
7. Communicate changes to all team members

**Version Semantics**:
- **MAJOR** (X.0.0): Backward-incompatible changes (principle removal, redefinition)
- **MINOR** (x.Y.0): New principles added, material expansions
- **PATCH** (x.y.Z): Clarifications, typo fixes, non-semantic refinements

**Enforcement**:
- Constitution violations block PR merge (automated checks where possible)
- Manual review required for complexity justifications
- Quarterly constitution review to identify outdated principles

**Version**: 1.2.0 | **Ratified**: 2026-03-14 | **Last Amended**: 2026-03-14

---

## Appendix: Quick Reference Checklist

### Every Feature Must Answer

1. **Security**: Does this need RLS? → Design policy before coding
2. **AI Content**: Does this generate legal text? → Document hallucination prevention
3. **API**: New endpoints? → Define Pydantic models first
4. **Cost**: Impact on free-tier? → Document optimization strategy
5. **Domain**: Pakistani legal specificity? → Validate formatting/jurisdiction
6. **Workflow**: Multi-step process? → Use LangGraph with state persistence
7. **Testing**: How to verify? → Write tests before implementation

### Pre-Deployment Checklist

- [ ] RLS tested with 3+ tenant contexts
- [ ] Hallucination prevention verified (test with non-existent legal sections)
- [ ] Free-tier usage <70% (DB, storage, API calls, bandwidth)
- [ ] Pakistani formatting validated (Legal size, margins, fonts)
- [ ] Cross-platform tested (Web + iOS + Android)
- [ ] Security scan passed (SQL injection, XSS, rate limiting)
- [ ] Performance benchmarks met (API <500ms p95, RAG <2s)
- [ ] Monitoring configured (alerts at 80% free-tier usage)

### Common Failure Modes

| Failure Mode | Prevention | Detection |
|--------------|-----------|-----------|
| Cross-tenant data leak | RLS policies + integration tests | Audit log analysis |
| Legal hallucination | RAG confidence threshold (0.75) + "cannot find" fallback | Manual review of generated docs |
| Type mismatch (Web/Mobile) | Auto-generate TypeScript from Pydantic | Contract tests in CI |
| Free-tier exceeded | Usage monitoring + alerts at 80% | Dashboard + daily reports |
| Incorrect formatting | Validate against court templates | Manual QA with sample docs |
| Workflow state loss | Persist state after each node | Workflow completion rate metric |
| Unoptimized embeddings | Chunk size 512 tokens, overlap 50 | Storage usage tracking |
