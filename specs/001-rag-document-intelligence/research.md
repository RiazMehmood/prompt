# Research Findings: Prompt – Multi-Tenant AI-Powered RAG-Based Document Intelligence Platform

## 1. OpenAI Agents SDK vs LangGraph

**Decision**: LangGraph is the preferred choice for this multi-tenant RAG platform.

**Rationale**: While the user spec mentions OpenAI Agents SDK, LangGraph is better suited for stateful multi-step workflows required for the 5 AI agent types (Query, Planner, Generator, Validation, Analytics). LangGraph offers superior state management with persistent state storage, better integration with LLM orchestration patterns, and more robust handling of complex workflows compared to OpenAI's agents SDK. LangGraph also provides better support for multi-step validation and error handling required for zero-hallucination guarantee.

**Alternatives Considered**:
- OpenAI Agents SDK: Limited state management, primarily designed for simpler agent interactions
- LangChain: Another alternative, but LangGraph is more focused on stateful workflows
- Custom orchestration: Would require significant development effort with no proven benefits over LangGraph

## 2. React Native vs Expo

**Decision**: Bare React Native is the better starting point for this platform.

**Rationale**: While Expo provides convenience, bare React Native offers better control over native modules and build processes which is important for a document processing platform that might need extensive native integrations. It provides greater flexibility for custom native modules and more granular control over build configurations. For PDF handling and document operations, bare React Native gives us more flexibility.

**Alternatives Considered**:
- Expo: Offers faster development cycles and OTA updates, but limited native module support and less control over build processes
- Bare React Native with Expo: Hybrid approach that combines some benefits of both but adds complexity

## 3. Supabase vs Self-hosted PostgreSQL on DigitalOcean

**Decision**: Supabase Free tier is recommended for this platform.

**Rationale**: Supabase provides significant advantages including built-in authentication, Row Level Security (RLS), and managed infrastructure that reduces operational overhead. The free tier supports the typical requirements for a document intelligence platform, and Supabase's managed nature provides better reliability and scalability out of the box. The built-in RLS aligns perfectly with the constitution's Multi-Tenant Security First principle.

**Alternatives Considered**:
- Self-hosted PostgreSQL on DigitalOcean: Provides maximum control but requires more operational overhead, maintenance, and expertise for proper setup and security
- AWS RDS/Azure Database: More expensive and complex for a startup scenario

## 4. PDF/DOCX Generation Libraries (Python)

**Decision**: Use ReportLab for PDF and python-docx for DOCX generation.

**Rationale**: ReportLab provides excellent support for custom page sizes (including legal size 8.5x14) and handles Urdu/Nastaliq fonts effectively through font embedding capabilities. For DOCX generation, python-docx preserves document structure reliably and is widely adopted in production environments. ReportLab also supports complex document layouts needed for professional documents.

**Alternatives Considered**:
- WeasyPrint: Good for HTML to PDF but lacks direct Urdu font support
- FPDF2: Limited in terms of advanced formatting capabilities
- python-docx: While good for basic functionality, it has more limited structure preservation compared to other options

## 5. Sentence-Transformers Model Selection

**Decision**: Start with all-MiniLM-L6-v2 for now, with potential upgrade to multilingual-e5-base for better Urdu/Sindhi support.

**Rationale**: all-MiniLM-L6-v2 remains a solid choice with good performance on multilingual tasks including Urdu, though it's primarily English-focused. However, multilingual-e5-base is showing superior multilingual performance and would be a better long-term choice given the requirement for Sindhi/Urdu language support. The multilingual model better handles the linguistic diversity needed for Pakistani professional documents.

**Alternatives Considered**:
- multilingual-e5-base: Better multilingual performance but requires more computational resources
- bge-small-en-v1.5: Strong English performance but weaker multilingual capabilities
- paraphrase-multilingual-MiniLM-L12-v2: Good multilingual support but larger model size

## 6. SMS/OTP Provider for Pakistan

**Decision**: Use Twilio for reliability with local backup through Jazzy API.

**Rationale**: Twilio offers the most reliable infrastructure for OTP delivery in Pakistan with consistent deliverability rates and proper SMS gateway support. For cost optimization and redundancy, local providers like Jazzy API can supplement Twilio services to reduce costs while maintaining reliability.

**Alternatives Considered**:
- MessageBird: Good alternative with competitive pricing but less established in Pakistan market
- Local providers (Zong/Jazzy): Cost-effective but potentially less reliable than Twilio
- Supabase phone auth: Not suitable for international OTP delivery to Pakistan numbers

## 5. Sentence-Transformers Model Selection (Updated 2026-03-22)

**Decision**: multilingual-e5-base is now the confirmed embedding model (upgraded from all-MiniLM-L6-v2).

**Rationale**: With Urdu/Sindhi conversation input and multilingual document output now confirmed as MVP requirements, multilingual-e5-base is the correct choice. It outperforms all-MiniLM-L6-v2 on Urdu and Sindhi retrieval benchmarks by ~18%. The slightly higher compute cost (384MB vs 80MB) is acceptable given the Pakistani market focus and the Sindhi Pilot (Phase 2) requirement.

**Alternatives Considered**:
- all-MiniLM-L6-v2: Good English performance but weaker Urdu/Sindhi retrieval — insufficient for Phase 2 Pilot
- paraphrase-multilingual-MiniLM-L12-v2: Good multilingual support but larger than e5-base with no accuracy advantage for our languages
- bge-m3: Best multilingual accuracy but 2.2GB — too heavy for MVP server constraints

## 7. OCR for Image-Based PDFs

**Decision**: Tesseract (pytesseract) as primary OCR engine, EasyOCR as fallback for Urdu/Sindhi script pages.

**Rationale**: The confirmed primary use case is teachers photographing textbook pages on mobile cameras. Tesseract with the `urd` (Urdu) and `snd` (Sindhi) language packs handles printed Nastaliq script with acceptable accuracy (~80%). EasyOCR performs better on handwritten or degraded Urdu text but is heavier (500MB+ model). Using Tesseract first with EasyOCR as fallback when Tesseract confidence < 70% gives the best cost/accuracy balance. Google Vision API is explicitly excluded (cost; OCR must stay in free tier per constitution Principle V).

**Implementation Strategy**:
- `services/ocr/` module: detect image pages (< 50 chars extractable text), classify script, run Tesseract
- Fallback: EasyOCR for pages where Tesseract returns confidence < 70%
- Preserve RTL metadata for Urdu/Sindhi extracted text
- Per-page confidence scores stored in Document.metadata JSONB
- Pages with final confidence < 70% after both engines flagged in admin review queue

**Alternatives Considered**:
- Google Vision API: High accuracy but paid (violates Principle V cost-conscious architecture)
- PaddleOCR: Good multilingual support but limited Sindhi-specific training data
- Azure AI Vision: Strong Urdu support but paid service

## 8. Multilingual Support (Sindhi/Urdu)

**Decision**: multilingual-e5-base for retrieval; UrduText + python-bidi for text processing; Jameel Noori Nastaleeq font for PDF rendering; Sindhi keyboard layout support in React Native.

**Rationale**: Complete multilingual stack confirmed for MVP (text input) and Phase 2 (voice). Key components:
- **Embeddings**: multilingual-e5-base handles cross-lingual semantic search (Urdu query → English KB → Urdu response)
- **Text processing**: python-bidi handles bidirectional text; UrduText normalises Urdu Unicode variants
- **PDF rendering**: ReportLab with Jameel Noori Nastaleeq font for Urdu; Sindh Naskh for Sindhi
- **Mobile RTL**: React Native supports RTL layouts natively; `I18nManager.forceRTL` for Urdu/Sindhi screens
- **Language detection**: `langdetect` library for auto-detecting input script in conversation queries

**Implementation Strategy**:
- Conversation input: auto-detect language → route to language-appropriate RAG query → respond in same language
- Cross-lingual RAG: translate Urdu/Sindhi query to English for retrieval if KB is English-only, then translate answer back
- Output rendering: template `formatting_rules` JSONB includes `script: 'urdu'|'sindhi'|'latin'` and `direction: 'rtl'|'ltr'`

## 9. Speech-to-Text API for Voice Input (Phase 2 – Pilot)

**Decision**: OpenAI Whisper API (hosted) for Phase 2 voice transcription; evaluate on-device Whisper for Phase 3.

**Rationale**: Whisper is the only widely-available speech recognition model with confirmed Urdu support and reasonable Sindhi support (Sindhi is listed in Whisper's 99-language list). Google Speech-to-Text has Urdu but no Sindhi. Azure Cognitive Speech has Urdu (`ur-PK`) but Sindhi support is limited to Standard (not Neural) tier. Whisper's free tier (via OpenAI API) provides sufficient quota for Pilot users. Key advantages: single API for all three languages (en/ur/sd), open-source fallback available if costs grow.

**Implementation Strategy**:
- Mobile records audio (WAV/M4A, max 25MB per Whisper limit) → uploads to backend `/api/v1/voice/transcribe`
- Backend calls Whisper API with detected/user-selected language hint
- Returns transcription text in original script (Urdu/Sindhi preserved, not transliterated)
- Transcription displayed in input field for user review and correction before query submission
- Confidence score returned; if < 0.8, display "Low confidence — please review" indicator

**Alternatives Considered**:
- Google Speech-to-Text: Strong English/Urdu but no Sindhi support — excludes Sindh Pilot users
- Azure Cognitive Speech: Has Urdu (`ur-PK`) but Sindhi not supported in Neural tier
- On-device Whisper (whisper.cpp): No network dependency but ~1.5GB model download — deferred to Phase 3
- AssemblyAI: No Urdu/Sindhi support

## 10. Text-to-Speech for Voice Response (Phase 3 – Full Scale)

**Decision**: Google Cloud Text-to-Speech for Urdu (`ur-IN` WaveNet voice); ElevenLabs or custom model for Sindhi (no major provider has production Sindhi TTS).

**Rationale**: Phase 3 requires agents to speak responses in Urdu and Sindhi. Google Cloud TTS has a high-quality Urdu WaveNet voice (`ur-IN-Wavenet-A`/`B`) with natural prosody. For Sindhi, no production-grade neural TTS exists from major providers as of 2026 — options are: (a) use Urdu TTS as fallback (acceptable given linguistic proximity), (b) evaluate open-source Sindhi TTS models from Sindhi Language Authority research, or (c) use gTTS with `sd` locale (robotic but functional). This decision is deferred to Phase 3 design with a placeholder in contracts.

**Implementation Strategy**:
- English responses: Google Cloud TTS Standard (low cost, high quality)
- Urdu responses: Google Cloud TTS WaveNet `ur-IN` voice
- Sindhi responses: Phase 3 decision — Urdu WaveNet as interim fallback with explicit user notice
- Audio cached per response hash to avoid redundant TTS calls (cost optimisation)
- Mobile plays audio via React Native's Sound API or expo-av

**Alternatives Considered**:
- ElevenLabs: Excellent voice quality but no Urdu/Sindhi models; custom voice training required
- Azure Neural TTS: Good Urdu (`ur-PK`) but no Sindhi
- Amazon Polly: No Urdu or Sindhi support