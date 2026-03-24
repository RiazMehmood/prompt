---
id: "0032"
title: Create Legal Templates Script (12 Pakistani Court Documents)
stage: green
date: 2026-03-24
surface: agent
model: claude-sonnet-4-6
feature: 001-rag-document-intelligence
branch: 001-rag-document-intelligence
user: riaz
command: write Python script create_legal_templates.py
labels: ["legal","templates","supabase","pakistan-court","thatta","script"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - backend/scripts/create_legal_templates.py
tests:
  - python3 syntax validation (PASS)
---

## Prompt

Write a Python script at `/home/riaz/Desktop/prompt/backend/scripts/create_legal_templates.py` that creates comprehensive templates in the Supabase DB for all Pakistani court document types found in the Thatta Session Court knowledge base.

The script should use the existing Supabase client setup and delete existing Legal domain templates first, then insert 12 templates covering: Bail Application, Vakalatnama, Legal Notice, Succession Certificate Application, Illegal Dispossession Application, Direct Criminal Complaint, Revenue Appeal (Sindh Land Revenue Act), Family Court Application, Rent Matter Application, Free Will Declaration (Marriage), Special Power of Attorney, and Application u/s 22-A Cr.P.C (FIR Registration).

Each template must have: id (uuid4), name, domain_id (00000000-0000-0000-0000-000000000001), description, content (full formatted document with {{slot_name}} placeholders), slot_definitions (array with name/label/type/required/data_source/rag_query_hint/options/enabled/placeholder), formatting_rules (Pakistani legal paper standard), version "1.0", is_active True.

## Response snapshot

Created `/home/riaz/Desktop/prompt/backend/scripts/create_legal_templates.py` — a complete, runnable Python script (approx. 1,300 lines) that:

1. **Deletes** all existing Legal domain templates via `db.table('templates').delete().eq('domain_id', LEGAL_DOMAIN_ID).execute()`
2. **Defines** shared `COURT_FORMATTING` rules (Legal paper 8.5x14, Times New Roman 12pt, 1.5 spacing, 1.5" left margin)
3. **Builds** 12 template dicts with full `content` strings, complete `slot_definitions`, and formatting_rules
4. **Batch-inserts** all 12 via `db.table('templates').insert(ALL_TEMPLATES).execute()`
5. **Prints** a summary table with slot count and RAG-slot count per template

RAG-retrieval slots included in:
- Bail Application (`bail_grounds`)
- Legal Notice (`legal_action_warning`)
- Succession Certificate (`legal_grounds`)
- Illegal Dispossession (`legal_grounds`)
- Direct Criminal Complaint (`legal_provisions`)
- Revenue Appeal (`legal_grounds`)
- Family Court Application (`legal_grounds`)
- Rent Matter Application (`eviction_grounds`)
- Application u/s 22-A (`legal_provisions`)

Run command: `python scripts/create_legal_templates.py` (from `backend/` with venv active)

## Outcome

- Impact: 12 comprehensive Legal domain templates ready to load into Supabase, replacing the single "Bail Application" template previously in DB
- Tests: Python syntax validated (ast.parse — PASS)
- Files: backend/scripts/create_legal_templates.py (created)
- Next prompts: Run the script with venv active; verify templates appear in admin panel; upload Thatta knowledge-base documents to ChromaDB so RAG slots are populated
- Reflection: All slots flagged enabled=False are admin-activatable extras; all documents follow authentic Pakistani court format with Thatta district header

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): syntax check PASS
- Prompt variant (if applicable): none
- Next experiment: run against live DB and verify slot rendering in frontend generate page
