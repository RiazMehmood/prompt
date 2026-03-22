---
id: 0006
title: Spec Update Multilingual Input and Voice Conversation
stage: spec
date: 2026-03-22
surface: agent
model: claude-opus-4-6
feature: 001-rag-document-intelligence
branch: 001-rag-document-intelligence
user: riaz
command: /sp.specify
labels: ["spec","voice-input","urdu","sindhi","multilingual-input","rtl","speech-to-text","text-to-speech","pilot","full-scale"]
links:
  spec: specs/001-rag-document-intelligence/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/001-rag-document-intelligence/spec.md
tests:
  - No automated tests for spec changes
---

## Prompt

i also want to use urdu/sindhi input in conversation and voice input in pilot project and full scale so customer can directly talk to agent in english/urdu/sindhi for discussion about their domain.

## Response snapshot

Updated spec.md with two phased capability additions:

**1. Multilingual Conversation Input (MVP — FR-055 to FR-057)**:
- AI interaction screen accepts Urdu/Sindhi text input with RTL keyboard support from MVP
- Auto-detects input language (English/Urdu/Sindhi) — no manual language selection required
- Agent responds in same script/language as user input by default; language override available

**2. Voice Input (Phase 2 – Pilot — FR-058 to FR-061)**:
- Microphone button on AI interaction screen; records and transcribes in English/Urdu/Sindhi
- Transcription displayed in correct script (RTL Urdu/Sindhi) for user review before submission
- Graceful handling of partial/interrupted recordings
- Auto-detects spoken language with manual pin option

**3. Full Voice Conversation (Phase 3 – Full Scale — FR-062 to FR-064)**:
- Text-to-speech agent responses in English/Urdu/Sindhi (native-voice models per language)
- Continuous hands-free back-and-forth conversation mode
- Urdu/Sindhi-native voice synthesis (not transliterated)

**Additional spec changes**:
- Session 2026-03-22 clarifications updated with voice and input decisions
- Overview updated with multilingual conversation paragraph
- 2 new edge cases (voice misrecognition, cross-language RAG query)
- Assumptions updated: voice is mobile-only, MVP is text input only
- SC-014 to SC-016 added (multilingual input, voice accuracy 80%, voice round-trip <8s)

## Outcome

- ✅ Impact: Platform now supports full multilingual interaction lifecycle: type in Urdu/Sindhi (MVP) → speak in Urdu/Sindhi (Pilot) → hear agent respond in Urdu/Sindhi (Full Scale)
- 🧪 Tests: SC-014 (text input same-script response), SC-015 (voice accuracy ≥80%), SC-016 (voice round-trip <8s)
- 📁 Files: specs/001-rag-document-intelligence/spec.md
- 🔁 Next prompts: /sp.plan to add speech API research (Whisper vs Google Speech vs Azure Speech for Urdu/Sindhi support)
- 🧠 Reflection: Phasing voice correctly (text-only MVP → voice-in Pilot → voice-out Full Scale) manages complexity. The critical insight is that Urdu/Sindhi text input is zero-extra-cost for MVP (just RTL keyboard support) while voice requires a speech API with multilingual models.

## Evaluation notes (flywheel)

- Failure modes observed: None — user requirement was clear and unambiguous about phasing
- Graders run and results (PASS/FAIL): New FRs are testable (PASS) — each has explicit acceptance condition
- Prompt variant (if applicable): null
- Next experiment: Consider whether voice input should also be available on web admin for accessibility, or strictly mobile-only as assumed
