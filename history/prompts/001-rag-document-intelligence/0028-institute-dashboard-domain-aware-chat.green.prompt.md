---
id: "0028"
title: "Institute Dashboard + Domain-Aware AI Chat"
stage: green
date: 2026-03-24
surface: agent
model: claude-sonnet-4-6
feature: 001-rag-document-intelligence
branch: 001-rag-document-intelligence
user: riaz
command: "institute dashboard, member management, domain-aware AI chat fixes"
labels: ["institute-admin","member-management","domain-aware","chat-ui","bug-fix","login-fix"]
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
  - frontend/src/utils/auth.ts
  - frontend/src/app/admin/institutes/page.tsx
  - frontend/src/app/institute/dashboard/page.tsx
  - frontend/src/app/user/chat/page.tsx
tests:
  - manual: tcs1@gmail.com logs in → redirects to /institute/dashboard ✅
  - manual: dashboard shows Education domain members only (no admin row)
  - manual: Add Member creates user with institute plan, no tier selector
  - manual: Remove Member unlinks institute_id
  - manual: education user opens chat → sees 🎓 icon + education suggestions
  - manual: "write a lesson plan" → agent asks for subject/grade/topic (no Urdu, no RAG auto-fill)
---

## Prompt

Session covering: institute admin login fix, institute dashboard member management, domain-aware AI chat, template fix.

## Response snapshot

**Login fix (tcs1@gmail.com not working)**
- Root cause: `UserRole` enum missing `institute_admin` and `staff` — Pydantic validation failed on login response
- Fixed: added `institute_admin`, `staff` to `UserRole`; added `free_trial`, `standard` to `SubscriptionTier`
- Fixed: `roleHomePath('institute_admin')` was `/institute-admin` → changed to `/institute/dashboard`

**Institute create + admin in one step**
- Create Institute modal now includes Admin Email + Admin Password fields
- On submit: creates institute, then calls `POST /institutes/{id}/create-admin` automatically
- Added `PATCH /institutes/{id}/admin` endpoint for updating existing admin credentials
- "+ Admin" button renamed to "Edit Admin" — leaves email/password blank to keep unchanged

**Institute dashboard — member management**
- `GET /institutes/my/users` now filters `.eq("role", "user")` — excludes institute_admin accounts
- New `POST /institutes/my/users` — creates auth user + profile, auto-derives tier from institute plan
- New `DELETE /institutes/my/users/{user_id}` — unlinks user from institute (no delete)
- Dashboard: Add Member modal (email + password only, no tier selector), Remove with confirm
- Table shows: email, plan, docs generated, uploads, joined, last active

**Domain-aware AI chat**
- Added `domain_name` field to `AuthenticatedUser` (loaded from domains table alongside namespace)
- Added `domain_name` to `/auth/me` response
- Cached in localStorage as `domain_name`, cleared on all logout paths
- Chat page: `useState(() => localStorage.getItem('domain_name'))` for synchronous init
- Domain config map: Legal→⚖️, Education→🎓, Medical→🏥, fallback→🤖
- Shows domain-specific suggestions, placeholder text, upload hint

**Document agent domain fix**
- `_detect_intent` prompt: was `"You are a legal AI assistant"` → `"You are a {domain_name} domain AI assistant"`
- `_generate_reply` system prompt: includes actual domain name, restricts answers to that domain
- All `"legal knowledge base"` strings → `"{domain_name} knowledge base"`
- `domain_name` stored in session state, passed through entire agent lifecycle

**Template fix (Education domain)**
- Existing template "Lesson Planner (Urdu)" had Urdu content + RAG slots for learning_objectives/activities
- Fixed via API PATCH: renamed to "Lesson Plan", content replaced with English template, all slots → user_input

## Outcome

- ✅ Impact: Institute admins can log in, manage members, and see domain-appropriate AI interface
- 🧪 Tests: All manual tests passing
- 📁 Files: 10 files modified
- 🔁 Next prompts: Run migration 009 in Supabase; upload Education/Medical knowledge base documents; test full lesson plan generation end-to-end
- 🧠 Reflection: Hardcoded "legal" strings were scattered across 5+ places in the AI layer — domain_name must flow from auth context all the way to every Gemini prompt

## Evaluation notes (flywheel)

- Failure modes observed: Pydantic enum validation silently converts to "Invalid credentials"; hardcoded domain strings in AI prompts cause domain bleed
- Graders run and results (PASS/FAIL): none automated
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): add Education knowledge base documents to test RAG for lesson plans
