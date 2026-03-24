---
id: "0025"
title: Chat Sidebar Sessions and Document Upload
stage: green
date: 2026-03-23
surface: agent
model: claude-sonnet-4-6
feature: 001-rag-document-intelligence
branch: 001-rag-document-intelligence
user: riaz
command: continue now
labels: ["chat","sessions","document-upload","ocr","template-sample","hitl"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - frontend/src/app/user/chat/page.tsx
  - frontend/src/app/user/layout.tsx
  - frontend/src/app/admin/templates/[id]/page.tsx
  - backend/src/api/v1/documents.py
  - backend/src/api/v1/templates.py
tests:
  - manual: chat sidebar loads past sessions on refresh
  - manual: new chat starts blank session
  - manual: delete session removes it from sidebar
  - manual: file upload sends extracted fields to agent
  - manual: admin can upload sample format in template editor
---

## Prompt

continue now

## Response snapshot

Implemented four features:

1. **`POST /documents/extract-fields`** (backend) — accepts PDF/image, runs TextExtractionService or OCROrchestrator, calls Gemini to extract slot values based on template slot_definitions, returns `{extracted_fields, raw_text}`.

2. **`POST /templates/{id}/sample`** (backend) — admin uploads sample/reference format document, stored in `./data/uploads/samples/`, path saved in `formatting_rules.sample_file_path`.

3. **Chat page redesign** (frontend) — ChatGPT-style layout with:
   - Left sidebar listing past chat sessions (grouped Today / Yesterday / Previous 7 days / Older)
   - New Chat button
   - Session auto-title from first user message
   - localStorage persistence in `chat_sessions_v2`
   - Delete session button (hover to reveal)
   - Toggle sidebar button
   - File upload (📎) button calls `/api/documents/extract-fields` → pre-fills document agent session with extracted values

4. **Template editor sample tab** (frontend admin) — new "Sample Format" tab in template editor with file upload area, shows current sample filename, replace button, and explanation of how AI uses it.

5. Removed redundant "Generate Document" nav item from user layout (document generation is now fully integrated into chat).

## Outcome

- ✅ Impact: Lawyers can upload FIR copies to auto-fill case fields; chat history persists across refreshes via session sidebar; admins can upload reference format documents for templates
- 🧪 Tests: Manual testing required; backend runs OCR + Gemini extraction pipeline
- 📁 Files: 5 files modified/created
- 🔁 Next prompts: Wire sample doc reference into document agent generation; add generated documents list in admin dashboard; institute admin scoped views
- 🧠 Reflection: Session sidebar uses localStorage for full client-side persistence; backend sessions (document agent state) are in-memory and not restored on reload — acceptable trade-off since document agent starts fresh per conversation

## Evaluation notes (flywheel)

- Failure modes observed: OCR on image files requires PIL which may not be installed in all environments
- Graders run and results (PASS/FAIL): none automated
- Prompt variant (if applicable): none
- Next experiment: Add generated documents table in admin dashboard; wire sample doc path into document agent prompt
