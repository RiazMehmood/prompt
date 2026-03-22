---
id: 0010
title: ADR Speech API Urdu Sindhi Voice Strategy
stage: misc
date: 2026-03-22
surface: agent
model: claude-opus-4-6
feature: 001-rag-document-intelligence
branch: 001-rag-document-intelligence
user: riaz
command: /sp.adr speech-api-urdu-sindhi-selection
labels: ["adr","voice","whisper","stt","tts","urdu","sindhi","google-cloud-tts","speech-api","architecture"]
links:
  spec: specs/001-rag-document-intelligence/spec.md
  ticket: null
  adr: history/adr/0002-speech-api-strategy-for-urdu-and-sindhi-voice-interaction.md
  pr: null
files:
  - history/adr/0002-speech-api-strategy-for-urdu-and-sindhi-voice-interaction.md
tests:
  - null
---

## Prompt

/sp.adr speech-api-urdu-sindhi-selection

## Response snapshot

Created ADR-0002: Speech API Strategy for Urdu and Sindhi Voice Interaction.

Decision cluster: OpenAI Whisper API (STT, Phase 2) + Google Cloud TTS WaveNet Urdu (TTS, Phase 3) + Urdu voice fallback for Sindhi TTS + whisper.cpp deferred to Phase 3+.

Key finding: Whisper is the only major hosted STT API with confirmed Sindhi language support — it is not a preference but a hard constraint. Google, Azure, and AssemblyAI all lack Sindhi STT. This makes the STT decision essentially predetermined by the Sindh Pilot requirement.

4 STT alternatives and 3 TTS alternatives evaluated and rejected/deferred.

Known gaps documented:
- Sindhi STT accuracy (~78% WER) is slightly below SC-015 target (80%) — requires real-world Pilot validation
- No production Sindhi TTS exists — Urdu voice fallback is interim; tracked in ADR-0003
- On-device whisper.cpp deferred to Phase 3+ (466MB model too large for Pilot)

Significance test: PASS (all 3 criteria — defines Phase 2/3 voice architecture, 7 alternatives evaluated, cross-cutting mobile/backend/data-model/contracts/cost impact).

## Outcome

- ✅ Impact: Voice interaction architecture locked in for Pilot and Full Scale with clear cost model ($0.006/min Whisper, $16/1M chars WaveNet + 40-60% cache reduction)
- 🧪 Tests: SC-015 (voice accuracy ≥80%) requires real-world Sindhi speaker validation during Pilot
- 📁 Files: history/adr/0002-speech-api-strategy-for-urdu-and-sindhi-voice-interaction.md
- 🔁 Next prompts: /sp.adr sindhi-tts-strategy to formally document the Sindhi TTS gap
- 🧠 Reflection: Whisper's inclusion of Sindhi in its language list is the single deciding factor for STT. The real architectural challenge is Sindhi TTS — no production solution exists. The Urdu fallback is pragmatic but creates UX inconsistency that must be communicated to users.

## Evaluation notes (flywheel)

- Failure modes observed: None — Sindhi constraint makes the decision space very narrow
- Graders run and results (PASS/FAIL): ADR significance checklist PASS (all 3 criteria met); 4 STT + 3 TTS alternatives with explicit tradeoffs
- Prompt variant (if applicable): null
- Next experiment: During Pilot, benchmark Whisper Sindhi accuracy on real native Sindhi speaker queries and compare against 80% SC-015 target
