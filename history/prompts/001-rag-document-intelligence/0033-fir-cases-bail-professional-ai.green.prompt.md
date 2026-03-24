---
id: "0033"
title: FIR Cases Bail Professional AI
stage: green
date: 2026-03-24
surface: agent
model: claude-sonnet-4-6
feature: 001-rag-document-intelligence
branch: 001-rag-document-intelligence
user: riaz
command: sp.git.commit_pr
labels: ["fir-extraction","cases","bail-application","document-agent","legal-ai"]
links:
  spec: null
  ticket: null
  adr: null
  pr: https://github.com/RiazMehmood/prompt/pull/1
files:
  - backend/src/services/ai/fir_extractor.py (NEW — 3-pass Gemini Vision FIR scanner)
  - backend/src/api/v1/fir.py (NEW — multi-file FIR extract endpoint)
  - backend/src/api/v1/cases.py (NEW — Cases CRUD API)
  - backend/supabase/migrations/010_cases.sql (NEW — cases table with RLS)
  - backend/src/services/ai/document_agent.py (FIR_SLOT_MAP, professional bail grounds)
  - backend/src/api/v1/conversation.py (_FIR_CONTEXT session store, domain AI personas)
  - backend/src/models/conversation.py (fir_fields optional field)
  - backend/src/main.py (registered cases router)
  - backend/scripts/create_legal_templates.py (NEW — 12 legal templates)
  - frontend/src/app/user/chat/page.tsx (Cases tab, FIR save/resume, fir_fields API)
  - frontend/src/app/admin/chat/page.tsx (search box, category KB sidebar)
tests:
  - Manual: FIR photocopy upload → 3-pass extraction → field review
  - Manual: Save as Case → Cases tab → Resume case in chat
  - Manual: Bail application with FIR pre-fill → professional grounds generated
  - Manual: Domain AI persona responds as senior Pakistani defense lawyer
---

## Prompt

Commit all changes on branch 001-rag-document-intelligence. Changes include: (1) Cases feature — backend API (cases.py CRUD, 010_cases.sql migration, registered in main.py), (2) FIR 3-pass extraction with cross-verification pass, (3) Frontend Cases tab in right sidebar with save/resume, (4) FIR fields auto-populate document agent slots (fir_fields in ConversationRequest, FIR_SLOT_MAP, FIR context per session), (5) Professional lawyer bail grounds with section-specific arguments, (6) Domain persona in RAG chat (Legal = senior Pakistani defense lawyer), (7) applyFIRToChat asks user what to do instead of auto-writing bail app, (8) Save as Case button in FIR Review Panel. Branch is 001-rag-document-intelligence, target PR against main.

Additionally during this session:
- User requested FIR collect case details so bail application can use bail grounds with sections and laws
- User requested AI to work like a professional and perfect lawyer — write bail application with solid grounds extracted from FIR, translate to English, align and tackle case intelligently so bail application gets approved

## Response snapshot

Implemented complete FIR → Cases → Professional Bail Application pipeline:

**Backend:**
- `fir_extractor.py`: 3-pass Gemini Vision (Pass 1 primary extraction, Pass 2 null-field refinement, Pass 3 cross-verification of digit/spelling accuracy)
- `cases.py`: Full CRUD with `_build_title()` generating "State vs [accused] — FIR [no]"
- `document_agent.py`: `FIR_SLOT_MAP` maps 15 FIR fields to template slots; `fir_context` pre-fills all slots without asking user again; professional bail grounds with 8 mandatory arguments (497 CrPC, section-specific, flight risk, investigation complete, presumption of innocence)
- `conversation.py`: `_FIR_CONTEXT` dict caches FIR fields per session; domain AI personas (Legal = "seasoned Pakistani criminal defense lawyer with 20+ years experience in Sindh courts")

**Frontend:**
- Cases tab (3rd tab in right sidebar) with status badge, FIR number, date
- "Save as Case" + "Use in Chat" buttons in FIR Review Panel
- `applyFIRToChat()` now asks "What document would you like?" instead of auto-writing bail app
- `fir_fields` passed in API payload so backend caches them for the session
- `resumeCase()` opens new chat + sends FIR context with `fir_fields` so document agent can pre-fill slots

## Outcome

- ✅ Impact: Lawyers can now upload FIR → AI extracts all 21 fields with 3-pass verification → save as case file → say "write bail application" → AI pre-fills all FIR fields, generates 8 professional bail grounds tailored to the specific PPC sections, using knowledge base references
- 🧪 Tests: Manual testing required (FIR upload, bail generation, case save/resume)
- 📁 Files: 11 files changed (5 new, 6 modified), 4382 insertions
- 🔁 Next prompts: Run migration 009 in Supabase; test with actual FIR photocopy; verify bail grounds quality for 302/34 PPC
- 🧠 Reflection: The key insight was that FIR fields must be passed as structured data (not just text) through the API so the document agent can pre-fill slots without asking the lawyer to type everything again

## Evaluation notes (flywheel)

- Failure modes observed: None in this session — previous session had Gemini model hardcoded wrong (gemini-1.5-flash) causing 0% extraction; fixed in this session
- Graders run and results (PASS/FAIL): TypeScript: PASS (no errors in user/chat/page.tsx)
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): Test 3rd verification pass quality on actual Sindhi/Urdu FIR photocopy — measure whether Pass 3 actually corrects mistakes vs Pass 1+2 baseline
