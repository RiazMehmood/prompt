---
id: "0029"
title: "CSV Import, Edu/Medical Templates, Institute Fixes"
stage: green
date: 2026-03-24
surface: agent
model: claude-sonnet-4-6
feature: 001-rag-document-intelligence
branch: 001-rag-document-intelligence
user: riaz
command: "items 7 & 8: bulk CSV import UI, Education + Medical domain templates, institute admin login fix, institute dashboard member management, domain-aware AI chat"
labels: ["csv-import","education","medical","institute-admin","member-management","domain-aware","chat-ui","bug-fix","login-fix","templates"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - backend/src/models/user.py
  - backend/src/api/dependencies.py
  - backend/src/api/v1/auth.py
  - backend/src/api/v1/institutes.py
  - backend/src/api/v1/conversation.py
  - backend/src/services/ai/document_agent.py
  - backend/supabase/migrations/009_education_medical_domains.sql
  - frontend/src/utils/auth.ts
  - frontend/src/app/admin/institutes/page.tsx
  - frontend/src/app/admin/users/page.tsx
  - frontend/src/app/institute/dashboard/page.tsx
  - frontend/src/app/user/chat/page.tsx
tests:
  - manual: tcs1@gmail.com logs in → redirects to /institute/dashboard ✅
  - manual: institute dashboard shows Education domain members only (no admin row) ✅
  - manual: Add Member creates user with auto-derived tier (no tier selector) ✅
  - manual: Remove Member unlinks institute_id ✅
  - manual: education user opens chat → sees 🎓 icon + education suggestions ✅
  - manual: "write a lesson plan" → agent uses Education domain context (no Urdu, no legal RAG) ✅
  - manual: Lesson Plan template has all user_input slots, English content ✅
  - manual: CSV Import UI visible in admin users page ✅
---

## Prompt

Session covering items 7 & 8 from backlog:

1. tcs1@gmail.com (institute_admin) login not working — fix it
2. Institute creation UX: combine institute + admin creation into one modal; add "Edit Admin" capability
3. Institute dashboard: add member management (add/remove), view member usage
4. Fix: admin emails showing as regular members in dashboard
5. Fix: institute members should inherit tier from institute plan — not admin-controlled
6. Fix: Education domain users seeing legal AI suggestions, legal templates, legal prompts
7. Fix: "Lesson Planner (Urdu)" template — rename, replace Urdu content with English, change RAG slots to user_input
8. Item 7 (backlog): Bulk CSV import UI in admin users page
9. Item 8 (backlog): Add Education + Medical domain content/templates (migration 009)

## Response snapshot

**Login fix (tcs1@gmail.com)**
- Root cause: `UserRole` enum missing `institute_admin` and `staff` — Pydantic validation failed silently → "Invalid credentials"
- Fixed: added `institute_admin`, `staff` to `UserRole`; added `free_trial`, `standard` to `SubscriptionTier`
- Fixed: `roleHomePath('institute_admin')` was `/institute-admin` → changed to `/institute/dashboard`

**Institute create + admin in one step**
- Create Institute modal now includes Admin Email + Admin Password fields
- On submit: creates institute, then calls `POST /institutes/{id}/create-admin` automatically
- Added `PATCH /institutes/{id}/admin` endpoint for updating existing admin credentials
- "+ Admin" button renamed to "Edit Admin"; leaves email/password blank to keep unchanged

**Institute dashboard — member management**
- `GET /institutes/my/users` now filters `.eq("role", "user")` — excludes institute_admin accounts
- New `POST /institutes/my/users` — creates auth user + profile, auto-derives tier from institute plan via `_PLAN_TO_TIER` dict
- New `DELETE /institutes/my/users/{user_id}` — unlinks user from institute (no account delete)
- Dashboard: Add Member modal (email + password only, no tier selector), Remove with confirm
- Table shows: email, plan badge, docs generated, uploads, joined, last active; quota progress bar

**Domain-aware AI chat**
- Added `domain_name` field to `AuthenticatedUser` (loaded from domains table alongside namespace)
- Added `domain_name` to `/auth/me` response and cached in localStorage
- Chat page: `useState(() => localStorage.getItem('domain_name'))` for synchronous init (no generic icon flash)
- Domain config map: Legal→⚖️, Education→🎓, Medical→🏥, fallback→🤖
- Shows domain-specific suggestions, placeholder text, upload hint per domain

**Document agent domain fix**
- `_detect_intent` prompt: `"You are a {domain_name} domain AI assistant"` (was "legal AI assistant")
- `_generate_reply`: includes actual domain name, restricts answers to that domain
- All `"legal knowledge base"` strings → `"{domain_name} knowledge base"`
- `domain_name` stored in session state, passed through entire agent lifecycle

**Template fix (Education — Lesson Plan)**
- Was: "Lesson Planner (Urdu)", Urdu script content, `learning_objectives`/`activities` as `rag_retrieval`
- Fixed via API PATCH: renamed to "Lesson Plan", English template content, all 9 slots → `user_input`
- Slots: subject, grade, week_number, date_range, lesson_topic, learning_objectives, activities, assessment, homework

**CSV Import UI (item 7)**
- "Import CSV" button in admin users page opens modal with file picker, domain selector, institute selector, tier selector
- `importUsersCSV()` calls `POST /admin/import-users` with FormData
- Results view shows Created/Skipped/Failed counts + scrollable error list

**Migration 009 (item 8)**
- Created `009_education_medical_domains.sql` — inserts Education + Medical domains with `ON CONFLICT DO NOTHING`
- 3 Education templates: Student Progress Report, Academic Recommendation Letter, Lesson Plan
- 3 Medical templates: Patient Discharge Summary, Medical Certificate, Referral Letter
- All slots `user_input`, all idempotent — **NOT YET RUN in Supabase**

## Outcome

- ✅ Impact: Institute admins can log in, manage members, see domain-appropriate AI; Education domain no longer bleeds legal content
- 🧪 Tests: All manual tests passing
- 📁 Files: 12 files modified/created
- 🔁 Next prompts: (1) Run migration 009 in Supabase SQL editor; (2) Upload Education knowledge base documents; (3) Upload Medical knowledge base documents; (4) Test full lesson plan generation end-to-end
- 🧠 Reflection: Domain bleed had 5+ blast sites (model enums, role redirect, chat UI, conversation.py, document_agent.py prompts) — any one missed causes user-visible domain confusion; must propagate domain_name as a first-class context field from auth → AI

## Evaluation notes (flywheel)

- Failure modes observed: Pydantic enum validation silently converts unknown values to validation error → "Invalid credentials" (opaque); hardcoded domain strings in AI prompts cause cross-domain bleed; async fetch causes 1-frame flash of generic UI (fixed with localStorage sync init)
- Graders run and results (PASS/FAIL): none automated
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): run migration 009 + upload 1 Education document to test RAG for lesson plans
