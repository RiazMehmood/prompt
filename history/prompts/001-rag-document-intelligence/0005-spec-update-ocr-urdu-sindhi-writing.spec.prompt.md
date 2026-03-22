---
id: 0005
title: Spec Update OCR and Urdu Sindhi Writing Support
stage: spec
date: 2026-03-22
surface: agent
model: claude-opus-4-6
feature: 001-rag-document-intelligence
branch: 001-rag-document-intelligence
user: riaz
command: /sp.specify
labels: ["spec","ocr","urdu","sindhi","multilingual","teacher-domain","image-pdf"]
links:
  spec: specs/001-rag-document-intelligence/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/001-rag-document-intelligence/spec.md
  - specs/001-rag-document-intelligence/checklists/requirements.md
tests:
  - No automated tests for spec changes
---

## Prompt

for urdu/sindhi planner writting support and ocr for image reading from images in pdf which normaly found while we take pictures of books and create image and follow this prompt for project [full project specification for Prompt platform — mobile-first deterministic AI RAG document intelligence platform with React Native, FastAPI, ChromaDB, OpenAI Agents SDK, Gemini API, DigitalOcean infrastructure]

## Response snapshot

Updated existing spec.md for feature 001-rag-document-intelligence with two major additions:

**1. OCR Pipeline (FR-045 to FR-049)**:
- Image-based PDF detection (< 50 chars extractable text per page triggers OCR)
- Server-side OCR with Urdu (Nastaliq), Sindhi, and Latin script support
- Per-page OCR confidence scoring with admin review flagging (< 70% confidence)
- Partial success handling — good pages proceed, failed pages reported without blocking
- RTL directionality preservation in extracted text metadata

**2. Urdu/Sindhi Multilingual Writing (FR-050 to FR-054)**:
- Teacher domain: lesson planners, test papers, MCQ sets in Urdu or Sindhi output
- Per-generation language selection (English / Urdu / Sindhi) for Teacher domain
- Correct Nastaliq rendering in PDF/Word exports with RTL layout
- Input script preservation (Urdu/Sindhi input stays in original script)

**Spec changes**:
- Added Session 2026-03-22 clarifications
- Updated Overview with OCR and multilingual paragraphs
- Added 2 edge cases (OCR failure handling, mixed PDF detection)
- Removed "OCR out of scope" assumption — now in scope for MVP
- Updated language assumption to cover English/Urdu/Sindhi outputs
- Added SC-012 (OCR ≥85% accuracy) and SC-013 (multilingual generation within 60s)
- Updated checklist notes

## Outcome

- ✅ Impact: Spec now covers complete teacher OCR workflow (photograph book → OCR → embed → generate in Urdu/Sindhi) and multilingual planner generation
- 🧪 Tests: Spec changes define acceptance criteria for OCR accuracy (SC-012) and multilingual output (SC-013)
- 📁 Files: specs/001-rag-document-intelligence/spec.md, specs/001-rag-document-intelligence/checklists/requirements.md
- 🔁 Next prompts: /sp.plan to update research.md with OCR library decisions (Tesseract vs. EasyOCR vs. PaddleOCR) and multilingual embedding model (multilingual-e5-base already in research.md — validate)
- 🧠 Reflection: OCR for book photographs is the primary knowledge base upload workflow in Pakistani classrooms — making it in-scope for MVP significantly improves teacher adoption. Sindhi-language output is critical for Sindh Pilot (Phase 2).

## Evaluation notes (flywheel)

- Failure modes observed: Original spec had "OCR out of scope" assumption that contradicted the core teacher domain use case (teachers photograph books)
- Graders run and results (PASS/FAIL): Spec quality checklist PASS after update — all 10 requirements testable, edge cases updated, assumptions corrected
- Prompt variant (if applicable): null
- Next experiment: Consider adding a User Story 8 specifically for "Teacher uploads photographed textbook page" to make the OCR workflow a first-class user story rather than an FR-level detail
