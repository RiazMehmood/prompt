---
id: "0027"
title: "Items 7-8: CSV Import UI + Education/Medical Domains"
stage: green
date: 2026-03-24
surface: agent
model: claude-sonnet-4-6
feature: 001-rag-document-intelligence
branch: 001-rag-document-intelligence
user: riaz
command: "work in sequence from 1 to 8"
labels: ["csv-import","bulk-users","education-domain","medical-domain","templates","admin-ui"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - frontend/src/app/admin/users/page.tsx
  - backend/supabase/migrations/009_education_medical_domains.sql
tests:
  - manual: open Admin → Users → Import CSV, upload a CSV with email column, verify results card shows created/skipped/failed
  - manual: run migration 009 in Supabase, verify Education and Medical domains appear in /domains
  - manual: verify 3 Education templates and 3 Medical templates appear under each domain in /admin/templates
---

## Prompt

work in sequence from 1 to 8 (items 7 and 8 — completing the sequence)

## Response snapshot

**Item 7 — Bulk CSV Import UI (frontend)**
- Added `showImport`, `importFile`, `importDomainId`, `importInstituteId`, `importTier`, `importLoading`, `importResult`, `importError`, `institutes` state to `UsersPage`.
- Added `fetchInstitutes()` (calls `GET /api/institutes?page_size=100`).
- Added `importUsersCSV()` — builds `FormData` with file + optional domain_id/institute_id/subscription_tier, calls `POST /admin/import-users`.
- Added "Import CSV" button in the header toolbar (left of existing buttons).
- Added full modal: file picker (accept `.csv`), domain selector, institute selector, tier selector, Import/Cancel buttons.
- Results view shows a 3-column card (Created / Skipped / Failed) plus a scrollable error list; "Done" button closes modal.

**Item 8 — Education + Medical domains and templates (migration 009)**
- Inserts `Education` domain (`education_ns` namespace) and `Medical` domain (`medical_ns` namespace), both `active`, with `ON CONFLICT DO NOTHING`.
- Education templates (3):
  - Student Progress Report — slots: student info, subject grades, attendance, teacher remarks, recommendation
  - Academic Recommendation Letter — slots: student/recommender/institution details, performance summary, character, achievements
  - Lesson Plan — slots: teacher/subject/class, objectives, materials, intro/main/practice/closure activities, assessment, homework
- Medical templates (3):
  - Patient Discharge Summary — slots: patient info, vitals, examination, investigations, diagnosis, treatment, discharge meds, follow-up
  - Medical Certificate — slots: patient/doctor info, diagnosis, illness details, fitness statement, purpose
  - Referral Letter — slots: patient/specialist/referring doctor info, reason, clinical summary, specific request
- All templates use `user_input` data_source, `ON CONFLICT DO NOTHING`, version `1.0.0`, `is_active = true`.

## Outcome

- ✅ Impact: All 8 items from the session backlog are now complete. Admin users page gains bulk CSV import. Platform has Education and Medical as first-class professional domains with 3 starter templates each.
- 🧪 Tests: Manual — upload CSV, run migration, verify templates in admin panel
- 📁 Files: frontend/src/app/admin/users/page.tsx, backend/supabase/migrations/009_education_medical_domains.sql
- 🔁 Next prompts: Upload sample documents to Education/Medical domains; test document generation with new templates; add Urdu/Sindhi translations for template content
- 🧠 Reflection: Migration uses dollar-quoted strings ($CONTENT$) to safely embed multi-line template content without escaping; ON CONFLICT clauses make it idempotent.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): none automated
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): add RAG-powered slots to Medical templates (e.g., drug_interactions from uploaded formularies)
