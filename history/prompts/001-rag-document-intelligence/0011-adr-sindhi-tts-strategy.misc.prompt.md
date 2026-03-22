---
id: 0011
title: ADR Sindhi TTS Gap and Interim Strategy
stage: misc
date: 2026-03-22
surface: agent
model: claude-opus-4-6
feature: 001-rag-document-intelligence
branch: 001-rag-document-intelligence
user: riaz
command: /sp.adr sindhi-tts-strategy
labels: ["adr","sindhi","tts","text-to-speech","voice","urdu-fallback","language-gap","architecture"]
links:
  spec: specs/001-rag-document-intelligence/spec.md
  ticket: null
  adr: history/adr/0003-sindhi-text-to-speech-gap-and-interim-strategy.md
  pr: null
files:
  - history/adr/0003-sindhi-text-to-speech-gap-and-interim-strategy.md
tests:
  - null
---

## Prompt

/sp.adr sindhi-tts-strategy

## Response snapshot

Created ADR-0003: Sindhi Text-to-Speech Gap and Interim Strategy.

Core problem: No production-grade Sindhi neural TTS exists from any major provider (Google, Azure, Amazon, ElevenLabs). The platform cannot block Full Scale launch on an external provider building Sindhi TTS.

Decision: Route Sindhi TTS to Google Cloud TTS Urdu WaveNet voice (ur-IN-Wavenet-A/B) as interim, with an explicit dismissible SindhiTTSNotice component on first voice response. Migration to a dedicated Sindhi voice when quality reaches MOS ≥ 3.5 from native speaker panel.

4 alternatives evaluated:
- Disable voice for Sindhi (Rejected): Worse than imperfect audio; discriminatory
- Self-host Sindhi Language Authority model (Deferred): MOS ~2.1, below threshold, GPU cost
- Fine-tune multilingual TTS on Sindhi data (Rejected): Data too scarce (<10h corpus), 3-6mo effort
- Partner with Sindhi Language Authority (Future): 12-24 month timeline; Phase 4+ consideration

Migration criteria defined: MOS ≥ 3.5, full Unicode block support, API/self-hostable <4GB GPU, cost ≤ $16/1M chars.

Significance test: PASS (affects all Sindhi users in voice mode, 4 alternatives with tradeoffs, cross-cutting UX/service/notice component impact).

## Outcome

- ✅ Impact: Full Scale can ship on schedule with transparent degradation notice rather than blocking on unsolved Sindhi TTS problem
- 🧪 Tests: SC-016 (voice round-trip < 8s) applies; Sindhi quality validated via user feedback during Pilot
- 📁 Files: history/adr/0003-sindhi-text-to-speech-gap-and-interim-strategy.md
- 🔁 Next prompts: /sp.implement to begin executing tasks from Phase 1
- 🧠 Reflection: The reputational risk with the Sindhi community is real — positioning voice as "Beta" for Sindhi in the Pilot UI is the right mitigation. The one-line migration path (dispatch table update) means no architectural debt is incurred by the interim decision.

## Evaluation notes (flywheel)

- Failure modes observed: None — problem space is clear; decision is forced by external constraint
- Graders run and results (PASS/FAIL): ADR significance checklist PASS; key differentiator is that this documents a known gap with a concrete migration trigger, not just "use Urdu as fallback"
- Prompt variant (if applicable): null
- Next experiment: Survey Sindhi-speaking pilot users on voice quality acceptability before Full Scale launch; use MOS feedback to calibrate migration urgency
