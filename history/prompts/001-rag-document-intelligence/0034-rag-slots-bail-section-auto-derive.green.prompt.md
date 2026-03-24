---
id: "0034"
title: RAG slots bail section auto-derive commit
stage: green
date: 2026-03-24
surface: agent
model: claude-sonnet-4-6
feature: 001-rag-document-intelligence
branch: 001-rag-document-intelligence
user: riaz
command: /sp.git.commit_pr
labels: ["bail","fir","rag-slots","document-agent","commit"]
links:
  spec: null
  ticket: null
  adr: null
  pr: https://github.com/RiazMehmood/prompt/pull/1
files:
  - backend/src/services/ai/document_agent.py
tests:
  - Manual slot audit confirmed only bar_council asked after FIR upload
---

## Prompt

continue

(Resuming from context-compacted session. Final pending task: commit document_agent.py changes for RAG_SLOTS expansion and bail/CrPC section auto-derivation from FIR.)

## Response snapshot

Committed `fix(bail): expand RAG_SLOTS and auto-derive bail/CrPC sections from FIR` (commit 754aabd) to branch `001-rag-document-intelligence` and pushed to remote. Existing PR #1 updated automatically.

Key changes committed:
- `RAG_SLOTS` expanded to include `bail_section`, `case_facts`, `sections`, `bail_type`
- `FIR_SLOT_MAP` changed to `dict[str, list[str]]` — `case_summary` fills both `case_summary` and `case_facts`
- `user_slots` filter excludes `RAG_SLOTS` so AI never asks user for bail/CrPC sections
- `_fill_rag_slot`: auto-derives 497(1)/497(2)+498 CrPC based on PPC sections cited
- `_fill_rag_slot`: translates FIR narrative to formal English case facts via Gemini
- `_generate_document`: skips RAG fill if slot already collected from FIR (except `bail_grounds`)
- `case_year` auto-derived from `fir_date` regex; defaults to current year

## Outcome

- ✅ Impact: AI no longer asks for bail sections or CrPC sections after FIR upload; only `bar_council` remains as a user-input field
- 🧪 Tests: Manual slot audit — before fix: 10+ fields asked; after fix: 1 field (bar_council)
- 📁 Files: backend/src/services/ai/document_agent.py (116 insertions, 31 deletions)
- 🔁 Next prompts: Test full end-to-end bail application flow; run migration 009 in Supabase
- 🧠 Reflection: Expanding RAG_SLOTS + FIR_SLOT_MAP list-based mapping cleanly separates "AI-derived" slots from "user-input" slots, reducing friction for lawyers significantly

## Evaluation notes (flywheel)

- Failure modes observed: FIR sections were being overwritten by empty RAG fill; case_summary not mapping to case_facts slot
- Graders run and results (PASS/FAIL): Manual slot audit PASS (only bar_council asked)
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): Make bar_council optional or pre-fill from user profile if available
