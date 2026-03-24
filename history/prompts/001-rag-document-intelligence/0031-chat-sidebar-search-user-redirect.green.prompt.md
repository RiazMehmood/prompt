---
id: "0031"
title: "Chat Sidebar Search User Redirect"
stage: green
date: 2026-03-24
surface: agent
model: claude-sonnet-4-6
feature: 001-rag-document-intelligence
branch: 001-rag-document-intelligence
user: riaz
command: sp.git.commit_pr
labels: ["chat", "sidebar", "search", "admin", "redirect", "templates", "documents"]
links:
  spec: null
  ticket: null
  adr: null
  pr: "https://github.com/RiazMehmood/prompt/pull/1"
files:
  - backend/src/api/v1/documents.py
  - backend/src/api/v1/templates.py
  - frontend/src/app/admin/chat/page.tsx
  - frontend/src/app/user/chat/page.tsx
  - frontend/src/utils/auth.ts
tests: []
---

## PROMPT_TEXT

Commit all changes from the 001-rag-document-intelligence session covering: items 7 & 8 (bulk CSV import UI, Education + Medical domain templates via migration 009), institute admin login fix, institute dashboard member management (add/remove members, usage view), domain-aware AI chat (Education/Medical/Legal icons and suggestions), document agent domain fix, Lesson Plan template fix (English, user_input slots), and all supporting bug fixes. Branch is 001-rag-document-intelligence, target PR against main.

Additionally (from session continuation):
- User chat: add search box above right sidebar to filter templates and KB documents
- Admin chat: add right sidebar with templates and KB docs (domain-aware, reloads on domain change)
- On user login, redirect directly to /user/chat (not /user landing)
- Left nav remains DashboardShell hover-expand sidebar

## RESPONSE_TEXT

Committed 5 files as `feat(chat): domain-aware right sidebar with search for user + admin chat` (de0f2fe) and pushed to `001-rag-document-intelligence`.

### Changes committed:
1. **`frontend/src/app/user/chat/page.tsx`** — RightSidebar search: live filtering of Templates + KB tabs with match-count badges, click-to-draft and reference-doc shortcuts
2. **`frontend/src/app/admin/chat/page.tsx`** — Full rewrite adding right sidebar; reloads on domain dropdown change; fetches `/templates?domain_id` and `/documents?doc_status=approved&domain_id`
3. **`backend/src/api/v1/templates.py`** — Added `domain_id` optional query param; admins can override to inspect any domain
4. **`backend/src/api/v1/documents.py`** — Same `domain_id` override for `list_documents`
5. **`frontend/src/utils/auth.ts`** — `roleHomePath('user')` → `'/user/chat'` for direct post-login redirect

PR #1 updated: https://github.com/RiazMehmood/prompt/pull/1
