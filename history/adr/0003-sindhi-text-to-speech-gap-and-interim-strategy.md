# ADR-0003: Sindhi Text-to-Speech Gap and Interim Strategy

- **Status:** Accepted
- **Date:** 2026-03-22
- **Feature:** 001-rag-document-intelligence
- **Context:** Phase 3 (Full Scale) requires the domain agent to respond with spoken audio in
  English, Urdu, and Sindhi — enabling fully hands-free voice conversation (FR-062 to FR-064).
  Google Cloud TTS, Azure Neural TTS, Amazon Polly, and ElevenLabs all provide high-quality Urdu
  neural voices but **none provide a production-grade Sindhi neural TTS voice** as of 2026. This
  creates a direct gap for Sindhi-speaking users — specifically the Sindh Pilot audience who are
  a primary target demographic. The platform cannot delay Full Scale launch to wait for an
  external provider to build Sindhi TTS, and cannot deliver a silent or error-state response when
  Sindhi users invoke voice conversation. A decision is needed on how to handle Sindhi spoken
  output: what interim solution to deploy, how to communicate the limitation transparently to
  users, and what conditions would trigger migration to a dedicated Sindhi voice.

<!-- Significance checklist
     1) Impact: ✅ Affects the user experience of the entire Sindhi-speaking user base in voice
        conversation mode; sets a precedent for handling underserved-language gaps
     2) Alternatives: ✅ 4 alternatives evaluated with distinct quality/cost/complexity tradeoffs
     3) Scope: ✅ Touches TTS service, mobile TTS notice component, quality criteria (SC-016),
        user communication strategy, and future migration trigger conditions -->

## Decision

**Interim (Phase 3 launch)**: Route Sindhi TTS requests to Google Cloud TTS Urdu WaveNet voice
(`ur-IN-Wavenet-A`/`B`) with explicit, dismissible user notice.

**Migration trigger**: Supersede this ADR when a production-grade Sindhi neural TTS solution
achieves ≥ MOS 3.5 (Mean Opinion Score) on intelligibility testing with native Sindhi speakers.

### Component Breakdown

#### Interim TTS Routing for Sindhi
- **Service**: `backend/src/services/voice/tts_service.py` — language dispatch table maps
  `sindhi` → Google Cloud TTS `ur-IN-Wavenet-A` (same as Urdu routing)
- **Audio quality**: Urdu WaveNet voice reads Sindhi text with Urdu phonological rules.
  Sindhi and Urdu share the Arabic Nastaliq script and ~60% vocabulary overlap (Persian/Arabic
  loanwords). Intelligibility for literate Sindhi/Urdu bilinguals (the majority of the target
  professional audience) is acceptable.
- **Known degradation**: Sindhi-specific phonemes (retroflex consonants unique to Sindhi, the
  `ڄ` and `ڃ` characters) will be pronounced with approximate Urdu equivalents. Not ideal,
  but comprehensible.
- **Cache**: Same TTS cache applies — Sindhi responses cached with the Urdu voice, reducing
  repeated synthesis API calls.

#### User Transparency — SindhiTTSNotice Component
- **Mobile**: `mobile/src/components/voice/SindhiTTSNotice.tsx` — shown on the **first** Sindhi
  voice response per user session (not on every response). Dismissible. Stores dismissal in
  AsyncStorage so it does not re-appear after first dismiss.
- **Message**: "Voice responses for Sindhi currently use an Urdu voice model. Audio may not
  perfectly match Sindhi pronunciation. Text response is fully accurate."
- **Principle**: Users are never misled — they are informed that the audio quality is a known
  limitation, not a bug. The text response remains authoritative.

#### Migration Monitoring
- Track Sindhi Language Authority TTS research publications (quarterly review)
- Track Google Cloud TTS and Azure Neural TTS language expansion announcements
- Evaluate any Sindhi TTS candidate against MOS 3.5 threshold with ≥ 20 native speaker ratings
- Migration path: update `tts_service.py` language dispatch and supersede this ADR — no
  architectural change required, only a voice model swap

#### Quality Criteria for Migration
A Sindhi TTS solution qualifies for replacing the interim when it meets ALL:
1. MOS intelligibility score ≥ 3.5 from native Sindhi speaker panel (≥ 20 raters)
2. Supports the full Sindhi Unicode block including extended characters (`ڄ`, `ڃ`, `ڻ`, etc.)
3. Available via API or self-hostable with < 4GB GPU requirement
4. Cost comparable to Google WaveNet ($16/1M chars or less) or self-hosted free-tier eligible

## Consequences

### Positive

- **Unblocks Full Scale launch**: Not waiting for Sindhi TTS means Phase 3 voice conversation
  ships on schedule. Sindhi users get voice functionality — even with a known quality caveat —
  rather than a broken or absent feature.
- **Transparent to users**: The `SindhiTTSNotice` component ensures no user is surprised or
  confused by the accent mismatch. Text response accuracy is unaffected.
- **Low implementation cost**: The interim requires no new API integration — Sindhi simply routes
  to the same Google TTS call as Urdu. The only new code is the one-time notice component.
- **Simple migration path**: When a production Sindhi TTS emerges, it is a one-line change in
  the dispatch table — no architectural refactoring. This ADR documents the migration conditions
  so the decision is not re-litigated from scratch.
- **Linguistic overlap justifies interim**: Sindhi-Urdu bilingualism is high among educated
  Pakistani professionals (the platform's target users), particularly in Sindh where Urdu is the
  official medium of education. Urdu voice output is unlikely to be incomprehensible.

### Negative

- **Inconsistent voice experience**: Urdu users hear a native voice; Sindhi users hear an
  Urdu-accented voice. This is a second-class experience for Sindhi speakers that cannot be
  fully mitigated by a notice component — it is a perceptible quality difference.
- **Sindhi-specific phoneme degradation**: Characters unique to Sindhi (`ڄ`, `ڃ`, `ڻ`) will
  be mispronounced. For names, technical terms, or government act titles in Sindhi, this may
  cause comprehension failures that the text fallback must cover.
- **Reputational risk with Sindhi community**: Shipping a product to the Sindh Pilot with
  known Sindhi voice degradation — even with a notice — may be perceived as disrespectful to
  the language and community. This risk must be weighed against the value of shipping at all.
  Recommended mitigation: position voice conversation as "Beta" for Sindhi in the Pilot UI.
- **Notice fatigue risk**: The dismissible notice may be dismissed without reading, leaving
  some users confused by audio quality without understanding the reason.
- **No clear timeline for resolution**: The migration trigger is quality-based, not date-based.
  No production Sindhi TTS solution has a committed release date from any major provider.
  The interim may persist longer than anticipated.

## Alternatives Considered

**Alternative A: Disable voice output entirely for Sindhi — text-only responses (Rejected)**
- Approach: TTS service returns null audio for `language=sindhi`; mobile shows text-only response
- Pros: No misleading audio; no pronunciation issues
- Cons: Creates a worse first-class/second-class split — Sindhi users literally cannot use voice
  conversation mode, which is a core Phase 3 feature. Discriminatory by language.
- **Rejected**: Denying the feature entirely is a worse outcome than imperfect audio.

**Alternative B: Self-host a Sindhi TTS model from Sindhi Language Authority (Deferred)**
- Approach: Deploy open-source Sindhi TTS research model on the platform's server
- Quality: Research-grade (MOS ~2.1); robotic, limited vocabulary, poor prosody
- Infra cost: ~2GB GPU server required for inference (~$50–100/month additional)
- Maintenance: Unstable API, requires model management expertise
- **Deferred**: MOS 2.1 is below the threshold for a user-facing feature. The audio would be
  less comprehensible than the Urdu WaveNet fallback. Revisit if quality reaches MOS 3.5.

**Alternative C: Fine-tune a multilingual TTS model on Sindhi data (Rejected for now)**
- Approach: Fine-tune a base multilingual TTS model (e.g., VITS, YourTTS) on Sindhi speech corpus
- Data availability: Sindhi speech datasets are limited; Sindhi Language Authority corpus (~10
  hours) is too small for high-quality fine-tuning
- Timeline: 3–6 months of ML engineering effort; outcome uncertain given data scarcity
- **Rejected for Phase 3**: Not feasible within the Full Scale timeline. Could be a Phase 4+
  investment if the platform achieves scale and Sindhi adoption justifies the ML effort.

**Alternative D: Partner with Sindhi Language Authority for custom TTS (Future Consideration)**
- Approach: Commission or partner with Sindhi Language Authority to develop a production TTS model
- Pros: Native Sindhi voice, full phoneme coverage, community endorsement
- Cons: 12–24 month timeline; requires partnership negotiation; significant investment
- **Future consideration**: If Sindhi user base grows to justify investment (tracked via analytics),
  initiate partnership discussions. Document as a Phase 4+ roadmap item, not a Phase 3 blocker.

## References

- Feature Spec: `specs/001-rag-document-intelligence/spec.md` — FR-062 to FR-064, SC-016 (voice round-trip < 8s)
- Implementation Plan: `specs/001-rag-document-intelligence/plan.md` — Research Decision 10 (TTS)
- Research: `specs/001-rag-document-intelligence/research.md` — Decision 10 (Text-to-Speech)
- Tasks: `specs/001-rag-document-intelligence/tasks.md` — T128–T134 (Phase 12 Full Voice)
  specifically T134 (`SindhiTTSNotice.tsx`)
- Constitution: `.specify/memory/constitution.md` — Principle VI (Domain-Specific Knowledge
  Boundaries — Sindhi language support for Education domain)
- Related ADRs: ADR-0001 (OCR Library Selection), ADR-0002 (Speech API Strategy — Whisper + Google TTS)
- Evaluator Evidence: `history/prompts/001-rag-document-intelligence/0007-plan-update-ocr-multilingual-voice.plan.prompt.md`
