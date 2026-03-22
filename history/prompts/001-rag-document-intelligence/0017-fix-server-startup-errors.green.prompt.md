---
id: "0017"
title: Fix server startup errors
stage: green
date: 2026-03-22
surface: agent
model: claude-sonnet-4-6
feature: 001-rag-document-intelligence
branch: 001-rag-document-intelligence
user: riaz
command: /sp.implement what next we need to do now?
labels: ["bug", "fastapi", "langgraph", "pydantic", "startup"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - backend/src/api/v1/documents.py
  - backend/src/api/v1/admin.py
  - backend/src/services/workflows/base_workflow.py
tests:
  - manual: server starts, /health returns 200, all 35 routes accessible via OpenAPI
---

## Prompt

what next we need to do now? (via /sp.implement)

## Response snapshot

All 148 tasks in tasks.md are marked [x]. Ran `/sp.implement` to determine next steps. Found the server couldn't start due to 4 import/compatibility bugs introduced during the large 148-task commit. Fixed all:

1. **`Depends` not imported in documents.py** — added `Depends` to FastAPI import line
2. **`current_user: DomainAssignedUser = Depends()`** — `DomainAssignedUser` is already `Annotated[..., Depends(...)]`; double-wrapping with `= Depends()` is invalid. Removed `= Depends()` and moved param before `Form(...)` default.
3. **`langgraph.graph.graph.CompiledGraph` missing** — langgraph 1.1.3 moved it to `langgraph.graph.state.CompiledStateGraph`. Updated import with alias.
4. **`Depends` not imported in admin.py + `RootAdminUser` ForwardRef** — added `Depends` import; replaced `_admin: RootAdminUser` type alias with `_admin: AuthenticatedUser = Depends(require_root_admin)` to avoid Pydantic 2 forward-ref resolution failure during OpenAPI schema generation.

**Result:** Server starts cleanly, `/health` returns `{"status":"ok"}`, all 35 routes are live.

## Outcome

- ✅ Impact: Backend server fully operational — all 35 API endpoints accessible
- 🧪 Tests: `curl /health` → 200 OK; `curl /openapi.json` lists all routes without error
- 📁 Files: documents.py, admin.py, base_workflow.py
- 🔁 Next prompts: Run end-to-end acceptance test (T148 SC-001–SC-016); test RAG retrieval `/api/conversation`; add `"indexed"` to document_status enum migration
- 🧠 Reflection: These were integration bugs from a large single-commit implementation — minor incompatibilities with installed library versions (langgraph 1.1.3, Pydantic 2). The pattern of `_`-prefixed params with `Annotated[..., Depends()]` type aliases is fragile with Pydantic 2 schema gen; prefer explicit `Depends()` in function signatures.

## Evaluation notes (flywheel)

- Failure modes observed: Server crashes on OpenAPI schema generation (triggered on first request to any endpoint); ForwardRef not resolved at runtime despite import being present
- Graders run and results (PASS/FAIL): manual health check PASS, openapi.json PASS
- Prompt variant (if applicable): null
- Next experiment: Run a real auth flow (register → login → upload document → query RAG) to validate the full path end-to-end
