# Feature Specification: Prompt – Multi-Tenant AI-Powered RAG-Based Document Intelligence Platform

**Feature Branch**: `001-rag-document-intelligence`
**Created**: 2026-03-21
**Status**: Active
**Input**: User description: "Build a mobile-first, deterministic AI platform (NOT a chatbot) using RAG, Template + Data Binding, with zero hallucination, multi-tenant architecture, dynamic domain creation, and minimal AI cost."

## Clarifications

### Session 2026-03-21

- Q: Should users be able to access multiple domains based on subscription tier, or are they locked to a single domain? → A: Single domain only — user is locked to one domain permanently, regardless of subscription tier. Subscription tiers control usage limits within that domain (document generation count, upload limits, etc.), not domain access.
- Q: How should users receive generated documents — in-app viewer, PDF, Word, or a combination? → A: Multiple formats — in-app structured viewer for instant preview, plus PDF download and Word (.docx) export for external use and editing.
- Q: Does MVP include actual payment processing or is it free-tier only? → A: Free tier only in MVP — Basic (free) tier is active and functional, paid tiers (Pro/Premium/Institutional) are visible in the UI as "Coming Soon" but not purchasable. Payment gateway integration (JazzCash/EasyPaisa) is deferred to Phase 2.

### Session 2026-03-22

- Q: Should OCR be in scope for processing photographs of books (image-based PDFs)? → A: Yes, OCR is now **in scope for MVP**. The primary use case is teachers photographing textbook pages and uploading them to the knowledge base. The system must extract text from these images using OCR, including Urdu and Sindhi scripts.
- Q: Should teacher domain planner/test generation support Urdu and Sindhi language output? → A: Yes — Urdu and Sindhi writing support is explicitly required for teacher domain. Teachers in Sindh generate lesson planners, test papers, and MCQ sets in Urdu and Sindhi. The system must produce correctly rendered Urdu/Sindhi script output, not transliterated or Latin text.
- Q: Should the AI interaction screen accept Urdu/Sindhi text input from users? → A: Yes — users must be able to type queries in English, Urdu, or Sindhi on the AI interaction screen. RTL input support is required from MVP.
- Q: Should voice input (speak-to-query) be supported? → A: Yes, but phased: **Pilot** introduces voice input (speech-to-text) so users can speak queries in English/Urdu/Sindhi; **Full Scale** adds voice response (text-to-speech) so the agent can speak back, enabling full voice conversation. MVP has text-only input.

## Overview

Prompt is a **deterministic AI document intelligence platform** — not a chatbot. It uses Retrieval-Augmented Generation (RAG) combined with a Template + Data Binding pipeline to generate domain-specific professional documents with **zero hallucination**. The platform is **mobile-first** (React Native), supports **multi-tenant isolation**, and allows root administrators to **dynamically create new professional domains** (Legal, Education, Healthcare, etc.) without code changes.

**Core Differentiator**: Every output is template-driven and RAG-grounded. If the system cannot find the required data in the knowledge base, it fails explicitly — it never guesses, fabricates, or generates freely.

**Multilingual Writing**: The Teacher domain supports **Urdu and Sindhi script output** for lesson planners, test papers, and MCQ sets — critical for Sindh-focused educational use. Teachers write in the language their students read.

**OCR Pipeline**: The platform processes image-based PDFs — including photographs of textbook pages — using optical character recognition with Urdu and Sindhi script support, enabling the most common knowledge base upload workflow in Pakistani classrooms.

**Multilingual Conversation Input**: Users interact with domain agents by typing in English, Urdu, or Sindhi. The AI interaction screen supports RTL text entry and responds in the same language/script as the user's input. In the Pilot phase, users can speak queries aloud in English, Urdu, or Sindhi (voice-to-text). In Full Scale, agents respond with spoken audio — enabling hands-free, fully native-language conversations.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Professional Document Generation via Mobile (Priority: P1)

A professional (e.g., lawyer, teacher, doctor) opens the Prompt mobile app, selects their domain, chooses a document type (bail application, lesson planner, MCQ set), provides input parameters, and receives a fully-formed, domain-compliant document generated from templates populated with RAG-retrieved data.

**Why this priority**: This is the core value proposition — deterministic document generation. Without this, the product has no reason to exist. A single-domain MVP delivering one document type proves the entire pipeline (RAG → Template → Data Binding → Validation → Output).

**Independent Test**: Can be fully tested by selecting "Legal" domain → "Bail Application" type → providing accused name, section, court → receiving a formatted bail application with correct legal citations from the knowledge base.

**Acceptance Scenarios**:

1. **Given** a lawyer is authenticated and on the Legal domain, **When** they select "Bail Application" and provide required fields (accused name, FIR number, section of law, court name), **Then** the system generates a bail application using the approved template populated with RAG-retrieved case law citations, formatted to Legal size (8.5" x 14") with correct margins.
2. **Given** a teacher is authenticated and on the Education domain, **When** they select "Lesson Planner" and provide subject, grade, chapter, **Then** the system generates a structured lesson plan using the board-specific template populated with textbook content retrieved from the knowledge base.
3. **Given** a user requests a document and the RAG system cannot find matching content in the knowledge base, **When** the data binding step executes, **Then** the system returns an explicit error "Required data not found in knowledge base: [specific missing field]" rather than generating content.
4. **Given** a user generates a document, **When** the validation engine checks the output, **Then** every data field in the document traces back to a specific RAG source with retrieval confidence ≥ 0.75.

---

### User Story 2 - User Authentication and Domain Access (Priority: P1)

A new user downloads the mobile app, registers with email/phone, verifies their identity, selects their professional domain, and gains access to domain-specific features and knowledge bases. The system enforces tenant isolation so each user's data remains private.

**Why this priority**: Authentication and domain assignment are prerequisites for all other features. Without user identity and domain context, no document generation, subscription, or analytics can function.

**Independent Test**: Can be fully tested by registering a new account → verifying email → selecting "Legal" domain → confirming the user only sees Legal-domain templates and knowledge base content.

**Acceptance Scenarios**:

1. **Given** a new user on the registration screen, **When** they provide email, password, and phone number, **Then** the system creates an account, sends a verification code, and blocks access until verification is complete.
2. **Given** a verified user, **When** they select their professional domain (Legal/Education/Healthcare), **Then** the system assigns the appropriate role and restricts RAG queries, templates, and features to that domain only.
3. **Given** an authenticated user in the Legal domain, **When** they attempt to access Education domain templates or knowledge base, **Then** the system returns a 403 Forbidden error and logs the access attempt.
4. **Given** a user's session token expires, **When** they make an API request, **Then** the system rejects the request with 401 and the mobile app redirects to login.

---

### User Story 3 - Knowledge Base Upload and Admin Review (Priority: P2)

An administrator uploads domain-specific documents (PDF textbooks, legal acts, medical protocols) to a domain's knowledge base. The system preprocesses the document (chapter extraction, section parsing, metadata tagging), places it in a review queue, and only adds it to the RAG-queryable index after admin approval.

**Why this priority**: The quality of the knowledge base directly determines output quality. The Human-In-The-Loop review process prevents contamination of the RAG system with unverified or misclassified content.

**Independent Test**: Can be fully tested by uploading a sample PDF → verifying it appears in the admin review queue with auto-extracted metadata → approving it → confirming it appears in RAG search results.

**Acceptance Scenarios**:

1. **Given** an admin on the document upload screen, **When** they upload a PDF (≤10MB), **Then** the system extracts text, identifies chapters/sections, generates metadata, and places the document in "pending" status in the review queue.
2. **Given** a document in "pending" status, **When** a user performs a RAG query, **Then** the pending document is NOT included in search results.
3. **Given** an admin reviewing a pending document, **When** they approve it, **Then** the system generates embeddings, indexes it in the vector store with domain metadata, and makes it queryable via RAG.
4. **Given** an admin reviewing a pending document, **When** they reject it with a reason, **Then** the uploader receives a notification with the rejection reason and the document is archived.

---

### User Story 4 - Subscription and Billing Management (Priority: P2)

A user views available subscription tiers (Basic/Pro/Premium), selects a plan, completes payment, and gains access to tier-specific features (higher document generation limits, additional domains, priority processing). Institutional users can purchase bulk subscriptions.

**Why this priority**: Revenue generation is essential for sustainability. Subscription tiers also control resource allocation and prevent abuse of the free tier.

**Independent Test**: Can be fully tested by viewing plan options → selecting "Pro" → completing mock payment → confirming document generation limit increases from 5/day to 50/day.

**Acceptance Scenarios**:

1. **Given** a user on the subscription screen, **When** they view available plans, **Then** they see clear feature comparison across Basic (free), Pro, and Premium tiers with pricing.
2. **Given** a Basic user who has reached their daily document generation limit (5/day), **When** they attempt to generate another document, **Then** the system shows a clear upgrade prompt with their current usage and plan limits.
3. **Given** an institution administrator, **When** they purchase a bulk subscription for 50 users, **Then** the system creates individual accounts linked to the institutional subscription with shared billing.
4. **Given** a Pro user whose subscription has expired, **When** they attempt to use Pro features, **Then** the system downgrades them to Basic access and notifies them of the expiration.

---

### User Story 5 - Dynamic Domain Creation by Root Admin (Priority: P3)

A root administrator creates a new professional domain (e.g., "Engineering") through the web admin panel by defining the domain name, uploading a knowledge base, configuring domain-specific templates, and assigning AI agent configurations — all without code changes.

**Why this priority**: Dynamic domain creation enables the platform to scale to unlimited professions without engineering intervention. This is the key to multi-tenant scalability but can be deferred until the core single-domain pipeline is proven.

**Independent Test**: Can be fully tested by creating "Engineering" domain → uploading engineering standards PDFs → creating a "Project Estimation" template → generating a test document from the new domain.

**Acceptance Scenarios**:

1. **Given** a root admin on the domain management screen, **When** they create a new domain with name, description, and icon, **Then** the domain appears in the user-facing domain selection screen on both mobile and web.
2. **Given** a newly created domain, **When** the admin uploads knowledge base documents, **Then** those documents go through the standard review → approval → embedding pipeline isolated to the new domain's vector namespace.
3. **Given** a newly created domain with approved knowledge base and configured templates, **When** a user selects this domain and generates a document, **Then** the RAG engine queries only this domain's vector namespace and uses only this domain's templates.
4. **Given** a domain with no approved knowledge base documents, **When** a user attempts to generate a document, **Then** the system returns "Domain knowledge base is empty. No documents can be generated." rather than falling back to other domains.

---

### User Story 6 - Promotional Token Application (Priority: P3)

A user receives a promotional token code (from marketing, institutional partnership, or loyalty program), enters it in the mobile app, and receives the associated benefit (subscription discount, extended trial, additional document credits).

**Why this priority**: Token system enables flexible marketing, institutional partnerships, and user acquisition campaigns. Important for growth but not core functionality.

**Independent Test**: Can be fully tested by creating a token in admin panel → entering the code in mobile app → confirming the discount is applied to subscription pricing.

**Acceptance Scenarios**:

1. **Given** a user on the token application screen, **When** they enter a valid token code, **Then** the system validates the code, checks expiry and usage limits, and applies the benefit (e.g., 30% discount on Pro subscription).
2. **Given** a token that has reached its maximum usage count, **When** a user tries to apply it, **Then** the system rejects it with "This token has been fully redeemed."
3. **Given** an expired token, **When** a user tries to apply it, **Then** the system rejects it with "This token expired on [date]."
4. **Given** a domain-specific token (e.g., "LEGAL2026"), **When** a user in a different domain tries to apply it, **Then** the system rejects it with "This token is only valid for the Legal domain."

---

### User Story 7 - Analytics Dashboard for Administrators (Priority: P3)

An administrator accesses the web-based analytics dashboard to view platform metrics: revenue trends, subscription distribution, domain usage patterns, churn rate, token performance, and per-tenant usage statistics.

**Why this priority**: Analytics enable data-driven decisions for growth and resource allocation. Important for business intelligence but the platform functions without it.

**Independent Test**: Can be fully tested by logging into admin panel → viewing the analytics dashboard → confirming charts display real data for revenue, subscriptions, and domain usage.

**Acceptance Scenarios**:

1. **Given** an admin on the analytics dashboard, **When** they select a date range, **Then** they see revenue trends, new subscriptions, churn rate, and active users for that period.
2. **Given** multiple active domains, **When** the admin views domain analytics, **Then** they see per-domain metrics: document generation count, active users, knowledge base size, and average generation time.
3. **Given** active promotional tokens, **When** the admin views token analytics, **Then** they see redemption rate, revenue impact, and remaining usage for each token.

---

### Edge Cases

- What happens when a user's internet connection drops mid-document-generation? The mobile app must show a clear "Generation in progress — will resume when connection is restored" message and cache the request for retry.
- How does the system handle a PDF upload that contains scanned images instead of text? The system automatically routes image-based PDFs through the OCR pipeline to extract text. If OCR extraction fails (blurry image, unsupported script variant), the system notifies the uploader: "OCR extraction failed for [page N]. Please retake the photo with better lighting and re-upload." It does NOT silently drop unreadable pages.
- How does the system determine if a PDF needs OCR vs. direct text extraction? The system checks each page for extractable text. Pages with less than 50 characters of extractable text are classified as image-based and processed via OCR. Mixed PDFs (some text pages, some image pages) are handled per-page.
- What happens when the RAG system returns results below the confidence threshold (< 0.75) for a required template field? The system must fail the generation and list which specific fields could not be confidently populated.
- How does the system handle concurrent document generation requests from the same user? Requests are queued and processed sequentially per user to prevent resource exhaustion.
- What happens when an admin deletes a domain that has active users? The system must prevent deletion and display "Cannot delete domain with [N] active users. Reassign or deactivate users first."
- What happens when the AI API (Gemini) is completely unavailable (all keys exhausted)? The system must return "Service temporarily unavailable. Your request has been queued and will be processed when service resumes." and queue the request.
- What happens when voice input cannot confidently recognise the spoken language (e.g. heavy accent, noisy environment)? The system displays the best-effort transcription with a "Did you mean?" suggestion and lets the user edit before submission. It never silently submits a misrecognised query.
- What happens when a user types in Urdu/Sindhi but the domain knowledge base only contains English-language documents? The system translates the query internally for RAG retrieval, but returns the answer in the user's chosen language. If translation confidence is low, the system notifies the user: "Limited content available in Urdu for this query — result quality may be reduced."

## Requirements *(mandatory)*

### Functional Requirements

**Authentication & User Management**

- **FR-001**: System MUST support user registration via email/password with email verification.
- **FR-002**: System MUST support phone number registration with SMS/OTP verification.
- **FR-003**: System MUST enforce role-based access control with roles: user, domain_admin, root_admin.
- **FR-004**: System MUST issue session tokens with configurable expiry and support token refresh.
- **FR-005**: System MUST enforce tenant isolation — users can only access data within their assigned domain and tenant context.

**Domain Management**

- **FR-006**: System MUST allow root admins to create new professional domains dynamically through a configuration interface (no code changes required).
- **FR-007**: Each domain MUST have an isolated vector namespace for RAG queries — cross-domain data leakage is forbidden.
- **FR-008**: System MUST support domain-specific template configurations, AI agent parameters, and knowledge base collections.
- **FR-009**: System MUST ship with at least one pre-configured domain (Legal — Pakistani law focus) for MVP.

**RAG Engine**

- **FR-010**: System MUST preprocess uploaded documents into structured chunks (by chapter, section, exercise) with metadata tagging (domain, document type, source, date).
- **FR-011**: System MUST generate embeddings locally and store them in a local vector database with domain-based collection isolation.
- **FR-012**: System MUST enforce a minimum retrieval confidence threshold of 0.75 — results below this threshold are discarded.
- **FR-013**: System MUST return explicit "data not found" errors when RAG retrieval fails for any required template field, never generating content to fill gaps.
- **FR-014**: System MUST support structured metadata filtering in RAG queries (by domain, document type, jurisdiction, date range).

**Template Engine**

- **FR-015**: System MUST support parameterized document templates with named slots for data binding (e.g., `{{accused_name}}`, `{{section_of_law}}`, `{{court_name}}`).
- **FR-016**: System MUST validate that all required template slots are populated before generating the final document.
- **FR-017**: System MUST support domain-specific document formatting rules (paper size, margins, fonts, citation format) configured per template.
- **FR-018**: System MUST allow admins to create, edit, and version templates through the admin interface.

**Data Binding Engine**

- **FR-019**: System MUST populate template slots exclusively from: (a) user-provided input fields, or (b) RAG-retrieved data with confidence ≥ 0.75.
- **FR-020**: System MUST reject any output where a template slot is populated by AI-generated content not grounded in the knowledge base.
- **FR-021**: System MUST log the data source (user input vs. RAG retrieval + source document ID + confidence score) for every populated slot.

**Validation Engine**

- **FR-022**: System MUST reject generated documents that contain: missing required data, extra ungrounded content, incorrect formatting, or hallucinated citations.
- **FR-023**: System MUST provide specific, actionable error messages identifying which validation checks failed and why.
- **FR-024**: Every generated document MUST include provenance metadata: which template was used, which RAG sources were retrieved, and confidence scores for each data point.

**AI Orchestration**

- **FR-025**: System MUST route AI requests through an orchestration layer that selects the appropriate model based on task complexity and cost optimization rules.
- **FR-026**: System MUST implement API key rotation to distribute load across multiple free-tier API keys and handle rate limiting gracefully.
- **FR-027**: System MUST cache AI responses for identical queries (semantic similarity ≥ 0.92) to minimize redundant API calls.
- **FR-028**: System MUST support five agent types: Query Agent (interprets user intent), Planner Agent (decomposes complex tasks), Generator Agent (produces template-bound output), Validation Agent (checks output integrity), Analytics Agent (processes usage data).

**Subscription & Billing**

- **FR-029**: System MUST support tiered subscriptions: Basic (free, limited usage), Pro (paid, higher limits), Premium (paid, full access), and Institutional (bulk, custom pricing). For MVP, only the Basic (free) tier is active and functional. Pro, Premium, and Institutional tiers MUST be visible in the UI with a "Coming Soon" label but MUST NOT be purchasable. Payment gateway integration is deferred to Phase 2.
- **FR-030**: System MUST enforce usage limits per subscription tier (document generations per day, uploads per day, priority processing). Domain access is not tier-gated — users are permanently assigned to a single domain.
- **FR-031**: System MUST track all billable events and provide clear usage reporting to users.

**Promotional Tokens**

- **FR-032**: System MUST support promotional tokens with configurable: discount percentage, usage limit, expiry date, domain restriction, and tier restriction.
- **FR-033**: System MUST validate tokens at application time: check expiry, usage count, domain eligibility, and one-per-user constraint.

**Analytics**

- **FR-034**: System MUST track and report: revenue trends, subscription distribution, active users, churn rate, document generation volume, domain usage, token performance, and per-tenant usage.
- **FR-035**: System MUST provide time-range filtering and domain filtering for all analytics queries.

**Mobile App**

- **FR-036**: Mobile app MUST provide offline-safe UI with graceful degradation — cached content remains accessible, and queued actions sync when connectivity resumes.
- **FR-037**: Mobile app MUST display document generation output as clean, structured content — not chat-like message bubbles.
- **FR-038**: Mobile app MUST support the following screens: Authentication, Dashboard (domain selection), Document Generation (controlled interaction), Document Upload, Generated Documents Viewer, Subscription & Billing, Token Application.

**Document Output**

- **FR-041**: System MUST display generated documents in an in-app structured viewer for instant preview on both mobile and web.
- **FR-042**: System MUST support PDF export of generated documents, formatted according to domain-specific rules (paper size, margins, fonts, citation format).
- **FR-043**: System MUST support Word (.docx) export of generated documents, preserving structure and formatting for offline editing.
- **FR-044**: System MUST allow users to share exported documents (PDF or Word) directly from the mobile app via the device's native share sheet.

**OCR Processing**

- **FR-045**: System MUST detect image-based pages in uploaded PDFs by checking extractable text volume per page (threshold: fewer than 50 characters triggers OCR processing).
- **FR-046**: System MUST process image-based PDF pages through an OCR pipeline to extract text before chunking and embedding, supporting Latin, Urdu (Nastaliq), and Sindhi scripts.
- **FR-047**: System MUST preserve correct reading order and script directionality during OCR extraction — Urdu and Sindhi text MUST be extracted right-to-left and stored with RTL metadata.
- **FR-048**: System MUST report per-page OCR confidence scores. Pages with OCR confidence below 70% MUST be flagged in the admin review queue with a warning: "Low OCR confidence on page [N] — manual review recommended."
- **FR-049**: System MUST allow partial OCR success — if some pages extract successfully and others fail, the successfully extracted pages proceed to the knowledge base; failed pages are reported to the uploader without blocking the successful pages.

**Multilingual Document Generation**

- **FR-050**: Teacher domain document generation MUST support Urdu-script output for all teacher document types: lesson planners, test papers, MCQ sets, and chapter summaries.
- **FR-051**: Teacher domain document generation MUST support Sindhi-script output for all teacher document types.
- **FR-052**: System MUST allow users to select output language (English / Urdu / Sindhi) per generation request within the Teacher domain. Non-teacher domains default to English unless explicitly extended.
- **FR-053**: Urdu and Sindhi outputs MUST use correct script rendering — Nastaliq typeface for Urdu, Sindhi-specific letterforms for Sindhi — with right-to-left layout in PDF and Word exports.
- **FR-054**: When user input is provided in Urdu or Sindhi (e.g., student name, subject name), the system MUST preserve the original script in the generated document rather than transliterating to Latin.

**Multilingual Conversation Input (MVP)**

- **FR-055**: The AI interaction screen MUST accept text input in English, Urdu, and Sindhi scripts. The input field MUST support right-to-left text entry and correct cursor behaviour for Urdu and Sindhi.
- **FR-056**: System MUST automatically detect the language/script of user input (English, Urdu, or Sindhi) and route the query to the agent without requiring the user to manually select a language.
- **FR-057**: Agent responses MUST be returned in the same language/script as the user's query by default. If the user queries in Urdu, the agent responds in Urdu. If in Sindhi, the agent responds in Sindhi. Language override MUST be available as a user-accessible setting.

**Voice Input (Phase 2 – Pilot)**

- **FR-058**: [Phase 2] Mobile app MUST provide a microphone button on the AI interaction screen. Tapping it begins recording and transcribes speech in English, Urdu, or Sindhi in real time.
- **FR-059**: [Phase 2] Transcribed text MUST be displayed in the user's script (Urdu/Sindhi in correct RTL script, not transliteration) in the input field before the user submits — allowing review and manual correction.
- **FR-060**: [Phase 2] System MUST handle partial or interrupted recordings gracefully, displaying the partial transcription and providing options to re-record or continue typing.
- **FR-061**: [Phase 2] Language of transcription MUST be auto-detected from spoken input. Users may also manually pin a transcription language from a language selector.

**Voice Response / Full Voice Conversation (Phase 3 – Full Scale)**

- **FR-062**: [Phase 3] System MUST support text-to-speech response delivery — agent answers are spoken aloud in the same language as the query (English, Urdu, or Sindhi), enabling fully hands-free domain conversations.
- **FR-063**: [Phase 3] Voice conversation mode MUST allow continuous back-and-forth: user speaks → agent responds in speech → user speaks again, without requiring manual taps between turns.
- **FR-064**: [Phase 3] Spoken agent responses MUST use natural-sounding voice synthesis appropriate for the language — Urdu responses MUST use a Urdu-native voice model, Sindhi responses a Sindhi-native voice model.

**Web Admin**

- **FR-039**: Web admin MUST provide: root admin dashboard, domain management (CRUD), template management, token creation, analytics dashboard, institutional account management.
- **FR-040**: Web admin MUST be accessible only to users with domain_admin or root_admin roles.

### Key Entities

- **User**: Represents a registered professional. Attributes: identity credentials, assigned domain (permanent, single domain), subscription tier, role, usage counters. Each user belongs to exactly one domain and cannot switch or access other domains. Root admins are the sole exception — they can access all domains for administrative purposes only.
- **Domain**: Represents a professional vertical (Legal, Education, Healthcare). Attributes: name, description, icon, configuration, status (active/inactive). Contains its own knowledge base, templates, and agent configurations.
- **Template**: Represents a reusable document structure with parameterized slots. Attributes: name, domain association, slot definitions (name, type, required/optional, data source), formatting rules, version. Belongs to exactly one domain.
- **Document (Knowledge Base)**: Represents an uploaded source document in the knowledge base. Attributes: file reference, domain, document type, metadata (chapters, sections), approval status (pending/approved/rejected), uploader, reviewer. Goes through approval workflow before becoming RAG-queryable.
- **Embedding**: Represents a vector chunk derived from an approved knowledge base document. Attributes: vector data, source document reference, chunk text, metadata, domain namespace. Queryable only after parent document is approved.
- **Generated Document**: Represents a user-generated output document. Attributes: template used, user, domain, slot values with provenance (source + confidence), validation status, creation timestamp. Supports three output formats: in-app structured view (default), PDF export (domain-formatted), and Word (.docx) export (editable).
- **Subscription**: Represents a user's active plan. Attributes: tier (Basic/Pro/Premium/Institutional), status, start date, expiry date, payment reference, usage limits.
- **Payment**: Represents a financial transaction. Attributes: user, amount, currency, payment method, status, subscription reference.
- **Promotional Token**: Represents a discount/credit code. Attributes: code, discount type/value, usage limit, current usage count, expiry date, domain restriction, tier restriction.
- **Token Usage**: Represents a single token redemption event. Attributes: token reference, user, redemption date, benefit applied.
- **Usage Log**: Represents an auditable system event. Attributes: user, action type, domain, resource, timestamp, details (request/response metadata).

## Assumptions

- **Default domain for MVP**: Legal (Pakistani law) is the initial domain, as it has the most clearly defined document formats and the constitution already contains detailed legal domain specifications.
- **Authentication method**: Email/password as primary, phone/OTP as secondary. OAuth (Google) is deferred to Phase 2. This aligns with the constitution's Supabase Auth approach.
- **Payment gateway**: MVP ships with free tier only — no payment processing required. Paid tiers are displayed as "Coming Soon" in the UI. Payment gateway integration (JazzCash/EasyPaisa for Pakistani market, Stripe as international fallback) is deferred to Phase 2 (Pilot).
- **Mobile framework**: React Native (not Expo) as the primary mobile framework, based on the user's explicit specification.
- **Offline capability**: Limited to cached content viewing and action queuing. Full offline document generation is not in scope.
- **OCR**: In scope for MVP. The primary use case is teachers photographing textbook pages on a mobile camera and uploading them as PDFs or images. The system must extract Urdu, Sindhi, and English text from these photographs. Fully offline OCR (on-device) is deferred to Phase 2; MVP uses server-side OCR.
- **Language support**: English is the primary UI language. Generated document output and conversation responses support English (all domains), Urdu (Legal and Education domains), and Sindhi (Education domain). The app UI chrome (menus, buttons, labels) remains English in MVP; Urdu/Sindhi UI translation is deferred to Phase 2. Conversation text input supports Urdu/Sindhi from MVP. OCR supports all three scripts.
- **Voice input**: Out of scope for MVP. Introduced in Phase 2 (Pilot) as speech-to-text input only. Full voice conversation (text-to-speech responses) is Phase 3 (Full Scale). Speech recognition relies on a third-party speech API with Urdu and Sindhi language models.
- **Voice in web**: Voice input is mobile-only. The web admin interface does not require voice interaction.
- **Concurrent users for MVP**: System is designed for up to 1,000 concurrent users initially, scaling to 10,000 in Phase 2.
- **Data retention**: User-generated documents retained indefinitely until user deletion. Usage logs retained for 1 year per the constitution.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can generate a complete, domain-compliant document in under 60 seconds from the time they submit the generation request.
- **SC-002**: 100% of generated documents pass validation — zero documents are delivered with missing required fields, ungrounded content, or incorrect formatting.
- **SC-003**: System achieves zero hallucination rate: every data point in every generated document traces to a specific source in the knowledge base with confidence ≥ 0.75.
- **SC-004**: Mobile app loads to interactive state in under 3 seconds on a 3G connection.
- **SC-005**: 90% of first-time users successfully generate their first document without external help or support tickets.
- **SC-006**: System supports 1,000 concurrent users in Phase 1 (MVP) without degradation (response time remains under 2 seconds for 95th percentile).
- **SC-007**: Knowledge base document upload-to-approval workflow completes in under 5 minutes for a standard PDF (≤10MB).
- **SC-008**: AI API costs remain under $0/month for MVP by using free-tier API keys with rotation and semantic caching (cache hit rate ≥ 60%).
- **SC-009**: New professional domains can be created and made operational (with knowledge base and templates) in under 2 hours without any code changes.
- **SC-010**: Platform achieves ≤5% monthly churn rate among paying subscribers within 3 months of pilot launch.
- **SC-011**: Tenant data isolation is absolute — zero cross-tenant data access incidents across all testing and production usage.
- **SC-012**: OCR pipeline successfully extracts readable text from ≥85% of clearly photographed textbook pages (standard classroom lighting, full page in frame, minimal motion blur). Urdu and Sindhi scripts included in this measurement.
- **SC-013**: Teacher domain generates complete lesson planners and test papers in Urdu or Sindhi within the standard 60-second document generation window, with correct script rendering and right-to-left layout in exported PDFs.
- **SC-014**: Users can type a query in Urdu or Sindhi on the AI interaction screen and receive a correctly rendered, same-script response from the domain agent without any language configuration steps.
- **SC-015** *(Phase 2)*: Voice input transcription achieves ≥80% word accuracy for clearly spoken English, Urdu, and Sindhi queries in standard mobile conditions (quiet room, standard microphone).
- **SC-016** *(Phase 3)*: Voice conversation round-trip (user speaks → agent responds in speech) completes in under 8 seconds for standard domain queries.
