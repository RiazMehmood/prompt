# ADR-0002: Speech API Strategy for Urdu and Sindhi Voice Interaction

- **Status:** Accepted
- **Date:** 2026-03-22
- **Feature:** 001-rag-document-intelligence
- **Context:** The platform introduces voice interaction in two phases: Phase 2 (Pilot) delivers
  speech-to-text (STT) so users can speak queries in English, Urdu, or Sindhi on the mobile AI
  interaction screen; Phase 3 (Full Scale) delivers text-to-speech (TTS) so agents respond with
  spoken audio in the user's language. Both capabilities must support Urdu (Nastaliq script,
  Pakistan dialect `ur-PK`) and Sindhi — the critical requirement for the Sindh Pilot target
  audience. Sindhi is the primary constraint: it is an underserved language in all major speech
  APIs and narrows the viable option space to one. The system must stay within free or low-cost
  tiers per constitution Principle V, and audio containing user queries must be deleted within
  30 seconds of transcription to comply with privacy requirements (FR-058 to FR-064).

<!-- Significance checklist
     1) Impact: ✅ Voice interaction defines the entire Phase 2/3 architecture — mobile audio pipeline,
        backend processing service, response delivery, VoiceSession lifecycle, GDPR cleanup
     2) Alternatives: ✅ 4 STT and 3 TTS alternatives evaluated; Sindhi support disqualifies most
     3) Scope: ✅ Cross-cutting — mobile recording/playback, backend voice service, data model
        (VoiceSession), contracts (voice endpoints), cost model, constitution compliance -->

## Decision

**Speech-to-Text (Phase 2 – Pilot)**: OpenAI Whisper API (`whisper-1`)
**Text-to-Speech (Phase 3 – Full Scale)**: Google Cloud TTS (WaveNet for Urdu; Urdu voice as interim Sindhi fallback)
**Future path**: whisper.cpp on-device for Phase 3+ offline voice mode (deferred, not rejected)

### Component Breakdown

#### Speech-to-Text — OpenAI Whisper API
- **Model**: `whisper-1` — multilingual, trained on 680,000 hours across 99 languages
- **Languages**: English (`en`), Urdu (`ur`), Sindhi (`sd`) — all confirmed in Whisper language list
- **Accuracy**: Urdu ~85% WER on clear speech; Sindhi ~78% WER (less training data, still functional)
- **Language handling**: Pass `language` parameter when known for better accuracy; omit for auto-detection
- **Script output**: Returns Urdu/Sindhi in Arabic-based scripts — no transliteration (required for FR-059)
- **Audio**: WAV or M4A, max 25MB, max ~30 minutes
- **Cost**: $0.006/minute — predictable, no free tier; gated behind Pilot subscription tiers
- **Privacy**: OpenAI deletes audio after transcription; backend `AudioCleanupService` removes temp file within 30 seconds

#### Text-to-Speech — Google Cloud TTS
- **Urdu**: `ur-IN-Wavenet-A` (female) and `ur-IN-Wavenet-B` (male) — WaveNet neural voices,
  natural prosody; Pakistan Urdu and India Urdu are mutually intelligible
- **English**: `en-US-Standard-C` — Standard tier (lower cost for high-volume common language)
- **Sindhi**: No production neural TTS exists from any major provider. **Interim: Urdu WaveNet
  voice with explicit user notice** — "Sindhi voice synthesis uses Urdu voice model." Acceptable
  given linguistic proximity (shared Arabic script, significant phonological overlap). Tracked
  separately in ADR-0003.
- **Cost**: WaveNet $16/1M chars; cached responses reduce effective cost by 40–60%

#### TTS Audio Cache
- Key: `sha256(text + language)` → stored MP3
- Serves repeated identical responses (standard agent phrases, common answers) without TTS API call
- Location: `backend/src/services/voice/tts_cache.py`
- Expected 40–60% cache hit rate for domain Q&A patterns

#### Service Structure
- `backend/src/services/voice/whisper_service.py` — STT, language hint, returns transcription + confidence score
- `backend/src/services/voice/tts_service.py` — TTS dispatch per language, returns audio stream
- `backend/src/services/voice/tts_cache.py` — MP3 cache with hash lookup
- `backend/src/services/voice/audio_cleanup.py` — GDPR-compliant temp audio deletion within 30 seconds
- `backend/src/services/voice/session_service.py` — VoiceSession lifecycle (recording → processing → completed/failed)
- Mobile: `useAudioRecorder.ts`, `useAudioPlayback.ts`, `VoiceInput.tsx`, `TranscriptionReview.tsx`

## Consequences

### Positive

- **Whisper is the only STT option with Sindhi**: Every other hosted STT API (Google, Azure,
  AssemblyAI) lacks Sindhi support. Whisper's inclusion of `sd` in its language list is a decisive
  differentiator — it is not a preference, it is the only viable choice for the Sindh Pilot.
- **Single API, three languages**: One Whisper integration handles English, Urdu, and Sindhi STT
  with no per-language routing logic. Reduces backend complexity significantly.
- **Auto language detection**: Whisper's built-in language detection removes the need for users
  to manually declare their language before speaking — lower friction for Pilot users unfamiliar
  with language settings.
- **Script-correct transcription**: Whisper returns Urdu and Sindhi in native Arabic-based scripts
  (not transliteration), satisfying FR-059 (display in original script for user review).
- **TTS cache reduces cost at scale**: 40–60% cache hit rate means the effective TTS cost is
  significantly below the worst-case per-character rate. Repeated domain phrases are free after
  first synthesis.
- **WaveNet Urdu quality**: Google WaveNet Urdu voices (`ur-IN`) are production-grade with natural
  prosody — acceptable user experience for Pakistan Urdu speakers despite the `ur-IN` locale.

### Negative

- **Whisper has no free tier**: Every minute of transcription costs $0.006. Unlike Tesseract
  (free), voice input has real ongoing cost from Pilot launch. Must be budgeted and gated behind
  subscription tiers to prevent abuse.
- **Sindhi STT accuracy risk**: Whisper's Sindhi (~78% WER) is below the SC-015 target of 80%
  in adverse conditions. SC-015 requires real-world validation with native Sindhi speakers during
  Pilot. May need to adjust success criteria or implement Sindhi-specific pre-processing.
- **No production Sindhi TTS**: The Urdu voice fallback for Sindhi TTS creates an inconsistent
  experience — Urdu speakers hear a native voice; Sindhi speakers hear an Urdu-accented voice.
  Tracked in ADR-0003 as a known gap requiring monitoring and potential future resolution.
- **Two cloud provider dependencies**: Whisper (OpenAI) for STT + Google Cloud TTS — two separate
  API keys, billing accounts, availability risks, and pricing surfaces. Mitigated by voice
  features being Pilot/Full Scale only (not MVP critical path).
- **Audio upload latency**: Record → upload to backend → Whisper API → return transcription adds
  2–4 seconds round-trip for a 10–20 second query. Acceptable for Pilot; requires measurement
  against SC-015 user expectations.
- **whisper.cpp deferred**: On-device transcription (no network, no cost, no privacy concern)
  remains unavailable until Phase 3+ due to 466MB model download size. Privacy-conscious users
  and low-connectivity regions cannot benefit from voice until then.

## Alternatives Considered

### STT Alternatives

**Alternative A: Google Cloud Speech-to-Text (Rejected)**
- English and Urdu (`ur-IN`/`ur-PK`): Strong support, ~88% accuracy
- Sindhi: Not listed in supported languages (v1 and v2 API as of 2026)
- Cost: $0.009/15 seconds (Standard), $0.016/15 seconds (Enhanced) — more expensive than Whisper
- **Rejected**: Sindhi is absent. Hard disqualification for the Sindh Pilot use case.

**Alternative B: Azure Cognitive Speech (Rejected)**
- Urdu: `ur-PK` supported in Neural STT tier — good quality, Pakistan dialect
- Sindhi: `sd-IN` listed as "limited preview" in Standard tier only; not available in Neural tier
- Cost: $1.00/hour audio (Standard), $1.60/hour (Custom Neural)
- **Rejected**: Sindhi is preview-quality only; Urdu-only solution would require separate Sindhi
  routing to another provider, adding complexity without benefit over Whisper's unified approach.

**Alternative C: AssemblyAI (Rejected)**
- Strong English transcription with speaker diarisation and auto-chapters
- Urdu: Not officially supported; documented as "may work partially" (unofficial)
- Sindhi: Not supported
- **Rejected**: Neither Urdu nor Sindhi officially supported. Not viable.

**Alternative D: On-device whisper.cpp (Deferred)**
- Runs Whisper locally on iOS/Android via React Native native module bridge
- `whisper-base`: ~139MB, ~75% Urdu/Sindhi accuracy; `whisper-small`: ~466MB, ~85% accuracy
- Zero ongoing cost, no network required, no audio ever leaves the device
- **Deferred to Phase 3+**: Model size (466MB for acceptable accuracy) is too large for Pilot
  app bundle. Viable as an opt-in "offline voice mode" for Full Scale users in low-connectivity
  areas. Not rejected — explicitly on roadmap.

### TTS Alternatives

**Alternative E: Azure Neural TTS for Urdu (Rejected for Full Solution)**
- `ur-PK-UzmaNeural`, `ur-PK-AsadNeural` — high quality Pakistan-dialect Urdu voices
- Sindhi: Not supported in Neural tier; same gap as Google
- Cost: ~$16/1M chars — comparable to Google WaveNet
- **Rejected**: Identical Sindhi gap to Google; no quality advantage for Urdu. Google chosen for
  existing GCP relationship (Cloud TTS + potential future GCP deployment on DigitalOcean migration).

**Alternative F: ElevenLabs (Rejected)**
- Exceptional English voice quality; custom voice cloning available
- Urdu: No pre-built Urdu model; custom training required (~$330/month Professional plan)
- Sindhi: No support
- Cost: $0.30/1K chars — 18× more expensive than Google WaveNet
- **Rejected**: No Urdu/Sindhi models; cost is prohibitive.

**Alternative G: Open-Source Sindhi TTS — Sindhi Language Authority (Deferred)**
- Research-level Sindhi TTS models published by Sindhi Language Authority (Pakistan)
- Quality as of 2026: Not production-grade; robotic prosody, limited vocabulary coverage
- Integration: Requires self-hosting a neural TTS inference server (~2GB GPU recommended)
- **Deferred**: Monitor quality trajectory. If reaches WaveNet-comparable quality, replace
  Urdu-voice fallback with dedicated model. Formally tracked in ADR-0003.

## References

- Feature Spec: `specs/001-rag-document-intelligence/spec.md` — FR-058 to FR-064, SC-015 (≥80% voice accuracy), SC-016 (voice round-trip < 8s)
- Implementation Plan: `specs/001-rag-document-intelligence/plan.md` — Research Decisions 9 (STT) and 10 (TTS)
- Research: `specs/001-rag-document-intelligence/research.md` — Decisions 9 and 10
- Data Model: `specs/001-rag-document-intelligence/data-model.md` — VoiceSession entity
- Contracts: `specs/001-rag-document-intelligence/contracts/openapi.yaml` — POST /voice/transcribe, POST /voice/synthesize
- Tasks: `specs/001-rag-document-intelligence/tasks.md` — T118–T135 (Phase 11–12)
- Constitution: `.specify/memory/constitution.md` — Principle V (Cost-Conscious), privacy (30s audio deletion)
- Related ADRs: ADR-0001 (OCR Library Selection), ADR-0003 (Sindhi TTS Gap Strategy — to be created)
- Evaluator Evidence: `history/prompts/001-rag-document-intelligence/0007-plan-update-ocr-multilingual-voice.plan.prompt.md`
