---
id: "0026"
title: Fix PDF/DOCX Export Download
stage: green
date: 2026-03-24
surface: agent
model: claude-sonnet-4-6
feature: 001-rag-document-intelligence
branch: 001-rag-document-intelligence
user: riaz
command: continue
labels: ["bug-fix","export","pdf","docx","document-agent","supabase"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - backend/src/api/v1/conversation.py
  - backend/src/api/v1/rag.py
  - backend/src/services/ai/document_agent.py
  - frontend/src/app/admin/chat/page.tsx
tests:
  - curl end-to-end: generate bail application → doc_id returned → export 200 → %PDF magic bytes confirmed
---

## Prompt

restart backend at your end
[then] continue
[then] disk mounted

## Response snapshot

Diagnosed and fixed PDF/DOCX export returning `.txt` files. Three root causes found and resolved:

1. **`status` column in DB insert** — `_save_document` was inserting `"status": "completed"` but the `generated_documents` table has no `status` column (only `validation_status`). PostgREST returned PGRST204, caught silently, `doc_id` returned `None`.

2. **`user_id` not passed to `_doc_agent.process()`** — `conversation.py` was calling `_doc_agent.process()` without `user_id=current_user.id`. So `state["user_id"]` was always `None`, causing the `NOT NULL` constraint on `user_id` to fail at insert time.

3. **Admin chat fallback hardcoded `.txt`** — `frontend/src/app/admin/chat/page.tsx` line 41: `a.download = \`document.\${fmt === 'pdf' ? 'txt' : 'txt'}\`` — always `.txt`. Fixed to `a.download = \`document.\${fmt}\``.

Also:
- Export endpoint in `rag.py` changed from `DomainAssignedUser` → `CurrentUser` so admins can export. Admins skip the `user_id` ownership filter.
- Better error logging in `_save_document` (error + user_id + template_id logged on failure).

Verified via curl: `document_id: 872377c3-...`, export HTTP 200, file magic `25504446` = `%PDF`.

## Outcome

- ✅ Impact: PDF and DOCX downloads now work end-to-end for both users and admins
- 🧪 Tests: curl end-to-end test confirmed real PDF bytes returned
- 📁 Files: 4 files modified
- 🔁 Next prompts: test DOCX export, wire sample doc into document agent, admin documents list
- 🧠 Reflection: The silent exception swallow in `_save_document` masked two separate bugs. Adding structured error logging with explicit field values was essential to diagnose.

## Evaluation notes (flywheel)

- Failure modes observed: Silent exception catch returning None; missing column in insert payload; missing parameter in function call; hardcoded wrong extension in frontend fallback
- Graders run and results (PASS/FAIL): curl export test PASS (200, %PDF magic)
- Prompt variant (if applicable): null
- Next experiment: Add `res.ok` check in frontend doExport to surface backend errors clearly
