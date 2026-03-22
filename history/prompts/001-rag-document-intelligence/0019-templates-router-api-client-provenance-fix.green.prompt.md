---
id: "0019"
title: Templates router, API client, provenance source_doc_id fix
stage: green
date: 2026-03-23
surface: agent
model: claude-sonnet-4-6
feature: 001-rag-document-intelligence
branch: 001-rag-document-intelligence
user: riaz
command: direct task execution
labels: ["templates", "api-router", "mobile", "api-client", "rag", "provenance", "bug-fix"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - backend/src/api/v1/templates.py (created)
  - backend/src/main.py (modified — templates router registered)
  - mobile/src/lib/api-client.ts (created)
  - backend/src/services/rag/retrieval.py (modified — document_id null fix)
  - backend/src/services/rag/provenance.py (modified — source_doc_id type Optional[str])
tests:
  - none added (file-only changes; server start excluded per instructions)
---

## Prompt

You are working on a FastAPI + React Native project at /home/riaz/Desktop/prompt.

## Task 1: Create backend /templates router
Create `/home/riaz/Desktop/prompt/backend/src/api/v1/templates.py` with these endpoints:
- `GET /templates` — list templates for current user's domain (filtered by domain_id, only active ones unless `include_inactive=true` query param). Requires auth (CurrentUser from dependencies.py). Returns list of template objects.
- `GET /templates/{template_id}` — get single template by ID. Requires auth.
[full prompt as provided by user — see conversation]

## Response snapshot

Four tasks completed:

1. Created `backend/src/api/v1/templates.py` — FastAPI router with `GET /templates` (filters by `domain_id` and `is_active`, returns empty list if user has no domain) and `GET /templates/{template_id}` (404 if not found or cross-domain). Inline `TemplateResponse` Pydantic model with all required columns. Uses `get_supabase_admin()` and `CurrentUser` dependency.

2. Edited `backend/src/main.py` — imported `templates_router` and registered it with `prefix="/templates"`, `tags=["Templates"]`, after the `admin_router` include.

3. Created `mobile/src/lib/api-client.ts` — exports `ApiClient` interface and `apiClient` object. Uses `fetch()` (no axios), reads base URL from `process.env.API_BASE_URL ?? 'http://localhost:8000'`, retrieves token from `AsyncStorage` key `'auth_token'`, attaches `Authorization: Bearer <token>` header when present, throws `Error(detail)` on non-2xx responses.

4. Fixed `source_doc_id` null bug in `backend/src/services/rag/retrieval.py` — changed `meta.get("document_id", "")` to `meta.get("document_id") or None` so missing `document_id` metadata surfaces as honest `None` instead of masking as `""`. Also updated `provenance.py` `record_rag_slot` signature to accept `Optional[str]` for `source_doc_id`.

## Outcome

- Impact: Templates API available at /templates; mobile app has a typed, token-aware HTTP client; RAG provenance records now show null source_doc_id honestly instead of masking with empty string.
- Tests: No tests added; no server start.
- Files: 2 created, 3 modified.
- Next prompts: add unit tests for templates router; test api-client token attachment; verify provenance records have correct document_id after retrieval.
- Reflection: The provenance null bug was subtle — retrieval.py masked missing metadata with "" (empty string), making the null invisible. Fix is minimal: one-line change.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): none run
- Prompt variant (if applicable): none
- Next experiment: add tests for templates router with mock Supabase
