---
id: "0021"
title: E2E Test and Schema Fixes
stage: green
date: 2026-03-23
surface: agent
model: claude-sonnet-4-6
feature: 001-rag-document-intelligence
branch: 001-rag-document-intelligence
user: Riaz Mehmood
command: /sp.implement — proceed with next steps
labels: ["e2e","analytics","subscriptions","schema","bugfix","voice","tokens"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - backend/src/api/v1/subscriptions.py (fix dict access → .id, use CurrentUser)
  - backend/src/api/v1/tokens.py (fix dict access → .id/.domain_id, use CurrentUser)
  - backend/src/api/v1/voice.py (fix dict access → .id, use CurrentUser, fix param order)
  - backend/src/services/analytics_service.py (fix schema: is_active→status, used_at→redemption_date, expires_at→expiry_date, status→validation_status)
  - backend/src/services/subscriptions/subscription_service.py (fix expires_at→expiry_date, fix usage_logs query to use action_type+timestamp, fix _upsert_usage to insert proper record)
  - backend/src/services/analytics_service.py (bulk fix get_supabase_client(service_role=True)→get_supabase_admin())
  - backend/src/services/documents/storage_service.py (same bulk fix)
  - backend/src/services/domain_config_service.py (same bulk fix)
  - backend/src/services/domain_service.py (same bulk fix)
  - backend/src/services/token_service.py (same bulk fix)
  - backend/src/services/voice/audio_cleanup.py (same bulk fix)
  - backend/src/services/voice/session_service.py (same bulk fix)
tests:
  - E2E: login → domains → templates → RAG conversation → doc generate → subscription → usage → analytics (all PASS)
  - analytics/overview PASS
  - analytics/documents PASS
  - analytics/domains PASS
  - analytics/subscriptions PASS
  - analytics/tokens PASS
  - frontend HTTP 200 (login page accessible)
---

## Prompt

yes go for next steps

## Response snapshot

Started frontend + backend dev servers, ran full E2E user journey test. Found and fixed multiple bugs:

**Schema mismatches fixed (analytics_service, subscription_service):**
- `subscriptions.is_active` → `subscriptions.status = 'active'`
- `subscriptions.expires_at` → `subscriptions.expiry_date`
- `domains.is_active` → `domains.status = 'active'`
- `token_usage.used_at` → `token_usage.redemption_date`
- `generated_documents.status` → `generated_documents.validation_status`
- `usage_logs.action/count/log_date` → `usage_logs.action_type/timestamp` (full rewrite of _get_today_usage and _upsert_usage)

**Auth dependency fixes (subscriptions, tokens, voice routers):**
- Replaced `current_user: dict = Depends(get_current_user)` + `current_user["user_id"]` with `current_user: CurrentUser` + `current_user.id`
- Fixed 27 occurrences of `get_supabase_client(service_role=True)` → `get_supabase_admin()` across 8 service files

**Final E2E status:**
- Login, Domains (3), Templates (1), RAG Conversation (5 sources), Document Generation (valid), Subscription current, Usage, Analytics (all 5 endpoints) — all PASS
- Frontend: HTTP 200 on /login page

## Outcome

- ✅ Impact: All core user journey flows verified end-to-end; analytics and subscription endpoints operational
- 🧪 Tests: 10/10 E2E checks pass; 5/5 analytics endpoints pass
- 📁 Files: 12 backend files modified
- 🔁 Next prompts: Add more templates for Education and Medical domains; improve bail_grounds RAG quality; run mobile E2E test on device
- 🧠 Reflection: Many service files used stale supabase client API and wrong column names that were never caught by unit tests — reinforces need for integration tests against real DB schema

## Evaluation notes (flywheel)

- Failure modes observed: Stale `get_supabase_client(service_role=True)` pattern in 8 service files; multiple column name mismatches between service layer and actual DB schema
- Graders run and results (PASS/FAIL): Full E2E PASS (10/10)
- Prompt variant (if applicable): "yes go for next steps" continuation
- Next experiment: Add integration test suite that validates column names against actual DB schema to prevent regressions
