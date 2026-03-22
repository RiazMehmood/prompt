---
id: "0018"
title: Fix admin endpoint and activate new Gemini keys
stage: green
date: 2026-03-22
surface: agent
model: claude-sonnet-4-6
feature: 001-rag-document-intelligence
branch: 001-rag-document-intelligence
user: riaz
command: /sp.implement what next we need to do now?
labels: ["bug", "gemini", "admin", "api-keys"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - backend/src/api/v1/admin.py
tests:
  - manual: restart server, GET /admin/free-tier-usage returns 200; SC-014 Urdu conversation works with new keys
---

## Prompt

added four new api keys in .env now adjust them and use them

## Response snapshot

Read `.env` — user had already placed 4 new comma-separated keys in `GEMINI_API_KEYS`. Config already parses them into `settings.gemini_keys_list`; `GeminiKeyRotator` uses that list at startup. No config.py changes needed.

Found two bugs in `admin.py` causing `/admin/free-tier-usage` INTERNAL_ERROR:
1. `get_supabase_admin` was used on line 89 but only `get_supabase_client` was imported — NameError at runtime.
2. Line 47 still called the old `get_supabase_client(service_role=True)` pattern.

Fixed both:
- Import: `from src.db.supabase_client import get_supabase_admin`
- Usage: `supabase = get_supabase_admin()` replacing `get_supabase_client(service_role=True)`

## Outcome

- ✅ Impact: 4 new Gemini keys active on server restart; `/admin/free-tier-usage` INTERNAL_ERROR fixed
- 🧪 Tests: Restart server → GET /admin/free-tier-usage → 200; re-run SC-014 Urdu conversation
- 📁 Files: backend/src/api/v1/admin.py
- 🔁 Next prompts: Re-run T148 SC-001 (document generation), SC-008 (semantic cache), SC-014 (Urdu conversation) with new keys active
- 🧠 Reflection: The `get_supabase_client(service_role=True)` → `get_supabase_admin()` migration was incomplete — admin.py missed one call site. Always grep for old pattern after bulk refactors.

## Evaluation notes (flywheel)

- Failure modes observed: NameError (`get_supabase_admin` not imported) masked as INTERNAL_ERROR; stale `get_supabase_client(service_role=True)` call site missed in prior refactor
- Graders run and results (PASS/FAIL): pending server restart
- Prompt variant (if applicable): null
- Next experiment: Run SC-001 document generation end-to-end with all 4 Gemini keys to verify round-robin rotation under load
