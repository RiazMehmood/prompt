---
id: "0035"
title: Medical domain FCPS exam prep spec
stage: spec
date: 2026-03-24
surface: agent
model: claude-sonnet-4-6
feature: 002-medical-exam-prep
branch: 001-rag-document-intelligence
user: riaz
command: chat
labels: ["medical","fcps","exam-prep","spec","question-bank","ai-tutor"]
links:
  spec: specs/002-medical-exam-prep/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/002-medical-exam-prep/spec.md
tests:
  - null
---

## Prompt

i want to clear that medical section is not for hospital it is for medical student preparation for exams i,e fcps, we will provide same level of question and other feature + ai feature like uworld, passtest and other plateform search the net for them and we need data according to that.

i dont have any question bank already, but may be at full scale we will purchase and fed to rag, and we also generate AI questions, FCPS for pilot, and usmle/mrcp for full scale, yes urdu must be there, also your proposed feature sets.

## Response snapshot

Researched UWorld, AMBOSS, Pastest, and FCPS-specific platforms (Interface, PakMedicine, StatPearls). Created full spec at `specs/002-medical-exam-prep/spec.md` covering:

- Target: FCPS Part I (basic sciences) + Part II (73 specialties), pilot scope
- Phase 1: AI-generated questions via Gemini + RAG from medical textbooks (no purchased bank yet)
- Phase 2: purchased question bank ingestion via RAG
- Full scale: USMLE + MRCP
- AI features: AI tutor (explain wrong, teach topic), case simulator, viva simulation, weak topic detection, predicted pass probability
- Practice modes: tutor, timed, subject, weak topic, rapid fire, past paper
- Urdu explanation toggle on all questions
- Spaced repetition flashcards (SM-2 algorithm)
- Image bank for X-ray/histology/clinical photos
- DB schema: questions, practice_sessions, session_answers, user_performance, flashcards
- Competitive positioning: only platform with FCPS + AI tutor + Urdu + Pakistan context

Updated memory: Medical domain is exam prep NOT clinical; migration 009 Medical templates are obsolete (wrong concept).

## Outcome

- ✅ Impact: Medical domain redefined from clinical templates to FCPS exam prep platform — spec created
- 🧪 Tests: null
- 📁 Files: specs/002-medical-exam-prep/spec.md (new)
- 🔁 Next prompts: sp.plan for 002-medical-exam-prep; sp.tasks for Phase 1 implementation; migration for questions/sessions tables
- 🧠 Reflection: Medical clinical templates in migration 009 are now incorrect. Need to skip those and create new migrations aligned to exam prep schema.

## Evaluation notes (flywheel)

- Failure modes observed: Incorrect Medical domain assumption (clinical vs exam prep) — caught and corrected by user clarification
- Graders run and results (PASS/FAIL): N/A
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): Run /sp.plan for 002-medical-exam-prep to get implementation plan
