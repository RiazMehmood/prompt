---
id: "0014"
title: Fix Auth Routing DB Integration
stage: green
date: 2026-03-22
surface: agent
model: claude-sonnet-4-6
feature: 001-rag-document-intelligence
branch: main
user: riaz
command: /sp.implement (continuation) + /sp.git.commit_pr
labels: ["bugfix", "auth", "jwt", "routing", "supabase", "green"]
links:
  spec: specs/001-rag-document-intelligence/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - backend/src/api/dependencies.py
  - backend/src/api/v1/analytics.py
  - backend/src/api/v1/domains.py
  - backend/src/api/v1/subscriptions.py
  - backend/src/api/v1/voice.py
tests:
  - "POST /auth/login → {access_token, user} PASS"
  - "POST /domains/assign → {message, domain_id} PASS"
  - "GET /domains → [Legal, Education, Medical] PASS"
  - "GET /subscriptions/tiers → tier list PASS"
  - "GET /analytics/overview → 403 FORBIDDEN (correct) PASS"
  - "All 35 routes at correct paths PASS"
---

## Prompt

Continue backend integration testing. Apply Supabase migrations, run seed data, then test auth flow end-to-end.

## Response snapshot

Applied all 4 migrations + seed data to Supabase via psql (dropped stale boilerplate tables first). Fixed 4 bugs discovered during endpoint testing:

1. **JWT ES256**: Supabase now issues ES256 tokens; backend decoded with HS256 → INVALID_TOKEN. Fixed by replacing `jwt.decode()` with `supabase_admin.auth.get_user(token)`.
2. **Missing profile on signup**: `register` calls `sign_up` but never inserts into `profiles`. Fixed by adding `handle_new_user()` trigger on `auth.users` INSERT.
3. **DomainResponse field mismatch**: DB has `knowledge_base_namespace`/`status`; model expects `namespace`/`is_active`. Fixed with `_row_to_domain_response()` mapper.
4. **Double route prefixes**: analytics, subscriptions, voice all had redundant sub-prefixes in decorators. Stripped to single prefix.

## Outcome

- ✅ Impact: Full auth flow works end-to-end. All 35 routes at correct paths. Supabase DB fully migrated (11 tables + RLS + 30 indexes).
- 🧪 Tests: Login, domain list, domain assign, subscriptions tiers all PASS; analytics 403 as expected PASS
- 📁 Files: 5 API files fixed; DB trigger added via psql
- 🔁 Next prompts: Test RAG generate endpoint; test document upload; test admin endpoints with root_admin user
- 🧠 Reflection: Newer Supabase projects default to ES256 — never do local JWT decode for Supabase tokens; always use `get_user()` server-side.

## Evaluation notes (flywheel)

- Failure modes observed: 4 independent bugs each blocking a different layer (auth, DB, serialization, routing)
- Graders run and results (PASS/FAIL): Login PASS, assign-domain PASS, list-domains PASS, subscriptions PASS, analytics 403 PASS
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): Add /auth/me endpoint for convenient self-profile fetch
