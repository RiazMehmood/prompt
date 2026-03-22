---
id: 0007
title: Plan Update OCR Multilingual Voice Architecture
stage: plan
date: 2026-03-22
surface: agent
model: claude-opus-4-6
feature: 001-rag-document-intelligence
branch: 001-rag-document-intelligence
user: riaz
command: /sp.plan
labels: ["plan","ocr","voice","whisper","tts","urdu","sindhi","multilingual","speech-to-text","text-to-speech"]
links:
  spec: specs/001-rag-document-intelligence/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/001-rag-document-intelligence/plan.md
  - specs/001-rag-document-intelligence/research.md
  - specs/001-rag-document-intelligence/data-model.md
  - specs/001-rag-document-intelligence/quickstart.md
  - specs/001-rag-document-intelligence/contracts/openapi.yaml
  - CLAUDE.md
tests:
  - No automated tests for plan changes
---

## Prompt

(empty — /sp.plan run to update all plan artifacts for new OCR, multilingual input, and voice requirements added in spec sessions 0005 and 0006)

## Response snapshot

Full plan update across all artifacts for 001-rag-document-intelligence:

**plan.md** — Rebuilt after setup script reset:
- Summary updated to mention OCR, multilingual conversation input, voice phasing
- Technical Context: added Tesseract/EasyOCR, OpenAI Whisper API (Phase 2), Google Cloud TTS (Phase 3)
- Constitution Check: all 7 principles re-validated with new capabilities
- Project structure: added backend/services/ocr/ and backend/services/voice/ modules
- Phase completion updated to reflect 10 research decisions (was 8)

**research.md** — 2 new decisions added:
- Decision 9: Speech-to-text → OpenAI Whisper (only major API with Urdu + Sindhi support)
- Decision 10: Text-to-speech → Google Cloud TTS for Urdu; Sindhi deferred (no production TTS available)
- Decision 5 updated: multilingual-e5-base now confirmed (was "consider upgrading")
- Decision 7 updated: Tesseract primary + EasyOCR fallback for Urdu/Sindhi pages

**data-model.md** — 4 additions:
- Document entity: +ocr_processed, +ocr_confidence_avg, +ocr_flagged_pages, +detected_language
- Embedding entity: +language field, +is_ocr_derived flag; embedding_vector dimension specified (768, multilingual-e5-base)
- GeneratedDocument entity: +output_language field (english/urdu/sindhi)
- NEW VoiceSession entity (Phase 2): audio recording lifecycle, transcription, GDPR-compliant auto-deletion

**contracts/openapi.yaml** — 3 new endpoints + 4 new schemas:
- POST /conversation (multilingual text query with auto language detection)
- POST /voice/transcribe (Phase 2: audio → Whisper → RTL-correct transcription)
- POST /voice/synthesize (Phase 3: text → TTS audio stream)
- New schemas: ConversationRequest, ConversationResponse, VoiceTranscribeRequest/Response, SpeechSynthesisRequest

**quickstart.md** — New env vars added: TESSERACT_CMD, OCR_CONFIDENCE_THRESHOLD, OPENAI_API_KEY (Whisper), VOICE_AUDIO_TEMP_DIR, GOOGLE_CLOUD_TTS_KEY

**CLAUDE.md** — Active Technologies updated with multilingual-e5-base, Tesseract/EasyOCR, Whisper API, Google Cloud TTS

## Outcome

- ✅ Impact: All plan artifacts now fully reflect OCR pipeline, multilingual I/O, and phased voice capability
- 🧪 Tests: Voice round-trip target (<8s, SC-016) and OCR accuracy (≥85%, SC-012) now have research backing
- 📁 Files: plan.md, research.md, data-model.md, quickstart.md, contracts/openapi.yaml, CLAUDE.md
- 🔁 Next prompts: /sp.tasks to regenerate tasks.md incorporating OCR service, multilingual conversation, and Phase 2 voice tasks
- 🧠 Reflection: Sindhi TTS is an unsolved problem (no production neural TTS exists) — using Urdu as interim fallback is pragmatic. Should be documented as known gap in Full Scale planning.

## Evaluation notes (flywheel)

- Failure modes observed: setup-plan.sh resets plan.md to template on every run — need to preserve previous content or use a different update flow
- Graders run and results (PASS/FAIL): Constitution check PASS (all 7 principles validated for new capabilities)
- Prompt variant (if applicable): null
- Next experiment: Consider whether /sp.plan should detect existing plan and update (diff) vs. full rebuild
