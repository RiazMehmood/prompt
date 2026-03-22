---
id: "0013"
title: Fix Backend Startup Errors
stage: green
date: 2026-03-22
surface: agent
model: claude-sonnet-4-6
feature: 001-rag-document-intelligence
branch: main
user: riaz
command: /sp.implement (continuation)
labels: ["bugfix", "fastapi", "langgraph", "startup", "green"]
links:
  spec: specs/001-rag-document-intelligence/spec.md
  ticket: null
  adr: history/adr/
  pr: null
files:
  - backend/src/api/v1/documents.py
  - backend/src/services/workflows/base_workflow.py
  - backend/pyproject.toml
tests:
  - "GET /health → {\"status\":\"ok\",\"version\":\"0.1.0\"} PASS"
  - "39 routes registered in OpenAPI spec PASS"
  - "Supabase + ChromaDB connect on startup PASS"
---

## Prompt

[Session resumed from compacted context]

Continue setting up and running the backend locally. The server was crashing on startup:
1. `ImportError: email-validator is not installed` (from previous session, now fixed)
2. Next error: `AssertionError: Cannot specify Depends in Annotated and default value together for 'current_user'` in documents.py
3. Then: `SyntaxError: non-default argument follows default argument` (Form default before DomainAssignedUser)
4. Then: `ModuleNotFoundError: No module named 'langgraph.graph.graph'` (API changed in installed version)

## Response snapshot

Fixed all three startup errors:

1. **documents.py upload route**: `current_user: DomainAssignedUser = Depends()` was invalid because `DomainAssignedUser` is already `Annotated[AuthenticatedUser, Depends(require_domain_assigned)]`. Removed `= Depends()`.

2. **documents.py Form ordering**: `document_type: str = Form(...)` before `current_user: DomainAssignedUser` caused Python syntax error. Changed to `Annotated[str, Form()]` to avoid default-value ordering conflict.

3. **base_workflow.py langgraph import**: `from langgraph.graph.graph import CompiledGraph` no longer exists. Changed to `from langgraph.graph.state import CompiledStateGraph as CompiledGraph`.

Server started successfully: Supabase connected, ChromaDB connected, 39 routes registered.

## Outcome

- ✅ Impact: Backend starts cleanly. `/health` returns `{"status":"ok","version":"0.1.0"}`. All 39 API routes accessible via Swagger UI at `/docs`.
- 🧪 Tests: GET /health PASS; 39 routes in OpenAPI PASS; Supabase + ChromaDB connected PASS
- 📁 Files: 3 files fixed in backend
- 🔁 Next prompts: Apply Supabase migrations; run seed data; test core API endpoints with real requests
- 🧠 Reflection: FastAPI's `Annotated` type aliases for Depends are elegant but fail silently when mixed with `= Depends()` defaults. Newer langgraph moved CompiledGraph to a different submodule — should pin dependency versions in pyproject.toml to avoid future breakage.

## Evaluation notes (flywheel)

- Failure modes observed: 3 chained startup errors — each only visible after fixing the previous one
- Graders run and results (PASS/FAIL): /health PASS, OpenAPI PASS, Supabase connect PASS, ChromaDB connect PASS
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): Pin langgraph to the specific version in pyproject.toml to prevent future API drift
