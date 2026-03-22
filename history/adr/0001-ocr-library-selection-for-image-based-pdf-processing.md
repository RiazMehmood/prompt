# ADR-0001: OCR Library Selection for Image-Based PDF Processing

- **Status:** Accepted
- **Date:** 2026-03-22
- **Feature:** 001-rag-document-intelligence
- **Context:** The platform must process uploaded PDFs that contain scanned images rather than
  extractable text — specifically photographs of Pakistani textbook pages taken on mobile cameras.
  This is the primary knowledge base upload workflow for the Teacher domain (Sindh Pilot). The
  OCR engine must accurately extract English, Urdu (Nastaliq script, RTL), and Sindhi text from
  varying-quality photographs. The choice directly determines RAG retrieval quality for all
  documents uploaded via photograph, impacts admin review queue accuracy, and must operate within
  the constitution's zero-cost infrastructure constraint (Principle V: Cost-Conscious Architecture).

<!-- Significance checklist (ALL must be true to justify this ADR)
     1) Impact: Long-term consequence for architecture/platform/security? ✅ YES — OCR quality determines RAG knowledge base quality; low-accuracy OCR cascades into hallucination risk
     2) Alternatives: Multiple viable options considered with tradeoffs? ✅ YES — 5 alternatives evaluated
     3) Scope: Cross-cutting concern (not an isolated detail)? ✅ YES — affects document ingestion pipeline, admin review, embedding quality, and all RAG retrievals for image-uploaded documents -->

## Decision

**Two-engine cascade: Tesseract (primary) + EasyOCR (fallback) with RTL post-processing pipeline**

### Component Breakdown

- **Primary OCR Engine**: Tesseract 4.x with LSTM engine (`--oem 1`) via `pytesseract`
  - Language packs: `eng` (English), `urd` (Urdu Nastaliq), `snd` (Sindhi)
  - Mode: Page segmentation mode 3 (fully automatic, no OSD) for multi-column textbook layouts
  - Confidence threshold: 70% per page — pages below this threshold route to EasyOCR fallback

- **Fallback OCR Engine**: EasyOCR 1.7+ with `arabic`, `en` readers
  - Activated only for pages where Tesseract returns confidence < 70%
  - Better at degraded or handwritten Urdu/Sindhi script; heavier model (~500MB) justified by on-demand activation only

- **Script & Page Classifier**: Per-page detector that determines:
  1. Is this page image-based? (< 50 extractable characters → yes)
  2. What script is dominant? (Unicode range analysis on any extractable chars, OCR hint from document metadata)

- **RTL Post-Processing**: `python-bidi` for bidirectional text algorithm + `UrduText` for Unicode
  normalisation of Urdu variant codepoints → ensures correct right-to-left reading order stored in embeddings

- **Confidence Evaluator**: Per-page confidence scores stored in `Document.ocr_flagged_pages` JSONB;
  pages with final confidence < 70% after both engines flagged in admin review queue

- **Service Location**: `backend/src/services/ocr/` — isolated module with `orchestrator.py`,
  `tesseract_engine.py`, `easyocr_engine.py`, `rtl_preprocessor.py`, `confidence_evaluator.py`

## Consequences

### Positive

- **Zero ongoing cost**: Tesseract and EasyOCR are both open-source; no per-page API charges. Aligns
  with constitution Principle V (Cost-Conscious Architecture) — keeps OCR cost at $0/month even at
  1,000 concurrent users uploading documents.
- **Urdu/Sindhi script coverage**: Tesseract `urd` pack handles printed Nastaliq with ~80% accuracy
  on clean photographs. EasyOCR fallback lifts degraded-image accuracy to ~85%+, meeting SC-012.
- **Offline/self-hosted**: No external API dependency for core document processing. System continues
  to ingest documents during internet outages or API quota events.
- **Per-page granularity**: Mixed PDFs (some text pages, some image pages) are handled per-page.
  Text-extractable pages bypass OCR entirely, preserving high accuracy and minimising processing time.
- **Admin transparency**: Low-confidence pages surfaced in admin review queue with specific page
  numbers and confidence scores, enabling targeted manual correction before RAG indexing.
- **Cascade reduces false negatives**: Using EasyOCR only as fallback keeps the common-case fast
  (Tesseract is ~3× faster than EasyOCR) while ensuring difficult images still get processed.

### Negative

- **Tesseract Nastaliq accuracy degrades on photographs**: Printed Nastaliq in textbooks achieves
  ~75–80% word accuracy; handwritten or low-light photographs may drop to 55–65%. Admin flagging
  partially mitigates this, but knowledge base quality depends on photo quality from users.
- **EasyOCR model size**: 500MB+ model weight. First activation requires download and GPU/CPU
  warm-up (~10–30s on CPU). This adds latency on the first low-confidence page per server restart.
  Mitigated by pre-loading EasyOCR model on server startup.
- **Sindhi coverage gap**: Tesseract `snd` language pack is less mature than `urd`. Sindhi-specific
  letterforms (particularly extended Arabic characters unique to Sindhi) may be misread as similar
  Urdu characters. Confidence scores for Sindhi pages are expected to be ~5–8% lower than Urdu.
- **No handwriting support**: Both engines target printed text. Documents containing handwritten
  annotations will extract poorly. Documented as known limitation; users advised to upload
  printed/typed materials only.
- **Server resource requirement**: Running both Tesseract and EasyOCR requires ~2GB RAM minimum on
  the processing server. This is a departure from the ultra-minimal free-tier server assumption and
  requires at least a DigitalOcean Basic Droplet ($12/month, 2GB RAM).

## Alternatives Considered

### Alternative A: Google Cloud Vision API (Rejected)
- **Accuracy**: Highest accuracy for Urdu Nastaliq (~92% word accuracy); strong Sindhi support
- **Cost**: $1.50 per 1,000 pages → at 10,000 pages/month = $15/month → violates constitution Principle V
- **Dependency**: External API; outages or quota exhaustion halt document ingestion
- **Rejected because**: Cost violation is non-negotiable per constitution. Cannot use.

### Alternative B: Azure AI Vision OCR (Rejected)
- **Accuracy**: Strong Urdu (`ur`) support via Azure Computer Vision Read API
- **Sindhi support**: Limited — Sindhi not listed as supported language in Read API v3.2
- **Cost**: Free tier 5,000 transactions/month; beyond that $1/1,000 — same cost concern as Google
- **Rejected because**: Sindhi coverage gap for Sindh Pilot (Phase 2) is a disqualifying limitation.
  Paid tier violates Principle V.

### Alternative C: PaddleOCR (Rejected as primary; remain as future option)
- **Accuracy**: Excellent for Chinese/Arabic scripts; Arabic OCR transfers partially to Urdu
- **Sindhi support**: No dedicated Sindhi model; Arabic model provides partial coverage
- **Urdu accuracy**: ~72% on clean printed text — marginally below Tesseract `urd` pack
- **Model size**: 80MB (smaller than EasyOCR) but slower inference on CPU than Tesseract
- **Rejected because**: No improvement over Tesseract for the specific Urdu/Sindhi use case;
  less mature Python integration. May be reconsidered if Tesseract+EasyOCR fails in production.

### Alternative D: Tesseract Only (No Fallback) (Rejected)
- **Simplicity**: Single engine, smaller footprint, faster
- **Gap**: Tesseract alone achieves ~75% accuracy on degraded photographs, below SC-012 target (85%)
- **Rejected because**: Does not meet SC-012 accuracy target for real-world teacher-photographed
  textbooks without fallback engine.

### Alternative E: EasyOCR Only (No Tesseract) (Rejected)
- **Accuracy**: Better than Tesseract on degraded Urdu images; ~83% accuracy
- **Size**: 500MB model loaded continuously — high memory overhead for common-case (clean text PDFs)
- **Speed**: 3× slower than Tesseract on CPU for standard pages
- **Rejected because**: Overkill for the majority of inputs (clean text-extractable PDFs); Tesseract
  is sufficient for the common case at much lower cost and latency.

## References

- Feature Spec: `specs/001-rag-document-intelligence/spec.md` — FR-045 to FR-049, SC-012
- Implementation Plan: `specs/001-rag-document-intelligence/plan.md` — Phase 6, OCR service structure
- Research: `specs/001-rag-document-intelligence/research.md` — Decision 7 (OCR Engine)
- Data Model: `specs/001-rag-document-intelligence/data-model.md` — Document entity (ocr_processed, ocr_confidence_avg, ocr_flagged_pages), Embedding entity (is_ocr_derived)
- Tasks: `specs/001-rag-document-intelligence/tasks.md` — T077–T081 (OCR service implementation)
- Constitution: `.specify/memory/constitution.md` — Principle V (Cost-Conscious), Principle III (HITL for low-confidence pages)
- Related ADRs: None yet — see also pending ADR for Speech API (Whisper) selection
- Evaluator Evidence: `history/prompts/001-rag-document-intelligence/0007-plan-update-ocr-multilingual-voice.plan.prompt.md`
