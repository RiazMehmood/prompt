# Implementation Plan: 001-RAG-Document-Intelligence

**Branch**: `001-rag-document-intelligence` | **Date**: 2026-03-21 | **Spec**: [specs/001-rag-document-intelligence/spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-rag-document-intelligence/spec.md`

## Summary

Implementation plan for a mobile-first, deterministic AI document intelligence platform using RAG and Template + Data Binding to generate professional documents with zero hallucination. The platform supports multi-tenant isolation, dynamic domain creation, OCR for image-based PDFs (book photographs), multilingual document output (English/Urdu/Sindhi), multilingual conversation input from MVP, and phased voice interaction (speech-to-text in Pilot, full voice conversation in Full Scale).

Based on research findings: LangGraph for 5 AI agent types, bare React Native for mobile, Supabase for managed PostgreSQL with RLS, multilingual-e5-base embeddings for Urdu/Sindhi retrieval, Tesseract+EasyOCR for image PDF processing, Whisper API for voice transcription (Pilot), and ReportLab/python-docx for document export.

## Technical Context

**Language/Version**: Python 3.11 (Backend), TypeScript 5.x (Frontend), Swift/Kotlin (Mobile Native Modules)
**Primary Dependencies**: FastAPI, LangGraph, Pydantic, Supabase Client, React Native, Next.js, ChromaDB, Sentence Transformers (multilingual-e5-base), Tesseract/EasyOCR, OpenAI Whisper API (Phase 2)
**Storage**: PostgreSQL (Supabase), ChromaDB (vector store), local file system (PDF/audio storage)
**Testing**: pytest, react-native-testing-library, jest
**Target Platform**: iOS 15+, Android 10+, Web (modern browsers)
**Project Type**: Full-stack mobile-first with API backend and admin web interface
**Performance Goals**: <60s document generation, <500ms API response (p95), <100ms RAG query, <8s voice round-trip (Phase 3)
**Constraints**: <500MB DB free tier, <10MB file upload limit, <2GB bandwidth, offline-capable mobile UI
**Scale/Scope**: 1,000 concurrent users (MVP), 10,000 (Phase 2), multi-tenant isolation

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Multi-Tenant Security First ✅
- **RLS Policies**: All user data tables have Row Level Security with tenant isolation
- **JWT Validation**: All API endpoints validate Supabase JWT and extract tenant_id before database queries
- **Cross-tenant Isolation**: Vector namespaces separated by domain/tenant to prevent data leakage
- **Voice sessions**: Voice transcription tied to authenticated user session; no cross-tenant audio leakage

### Hallucination Prevention ✅
- **Confidence Threshold**: Enforced 0.75 minimum for RAG retrievals
- **Template Validation**: All generated documents validated against structured templates
- **Provenance Tracking**: Every data point traced to specific RAG source with confidence score
- **OCR Confidence**: Pages with <70% OCR confidence flagged for admin review before RAG ingestion

### Human-In-The-Loop ✅
- **Document Approval**: All knowledge base documents follow pending → approved workflow
- **OCR Review**: Low-confidence OCR extractions flagged in admin queue
- **Voice Transcription**: Transcribed text displayed for user review/correction before query submission

### Strict Typing and API Contracts ✅
- **Pydantic Models**: All FastAPI endpoints use Pydantic v2 models for validation
- **TypeScript Generation**: TypeScript interfaces auto-generated from Pydantic schemas
- **Voice Request/Response**: VoiceTranscribeRequest and SpeechSynthesisRequest Pydantic models defined

### Cost-Conscious Architecture ✅
- **Free Tier**: Local ChromaDB, multilingual-e5-base (local), Gemini API Key Rotation
- **OCR**: Tesseract (local/free) as primary; EasyOCR as secondary for difficult scripts
- **Voice (Phase 2)**: Whisper API has generous free tier; evaluated against cost per minute
- **Semantic Caching**: Cache hit rate ≥60% to minimize API calls

### Domain-Specific Knowledge Boundaries ✅
- **Jurisdiction Filtering**: RAG queries filtered by domain and jurisdiction (Pakistan)
- **OCR Script Detection**: Image pages classified by script (Latin/Urdu/Sindhi) before OCR model selection
- **Multilingual Output**: Generated documents in English/Urdu/Sindhi per domain and user preference
- **Voice Language**: Speech recognition and synthesis use language-specific models per input

### Stateful Agentic Workflows ✅
- **LangGraph**: All complex workflows use LangGraph for state persistence
- **Resume Capability**: Workflows can resume after interruption
- **OCR Pipeline Node**: OCR processing is a LangGraph node in document ingestion workflow
- **Voice Pipeline**: Speech-to-text transcription feeds directly into the Query Agent workflow

## Project Structure

### Documentation (this feature)

```text
specs/001-rag-document-intelligence/
├── plan.md              # This file (/sp.plan command output)
├── research.md          # Phase 0 output (/sp.plan command)
├── data-model.md        # Phase 1 output (/sp.plan command)
├── quickstart.md        # Phase 1 output (/sp.plan command)
├── contracts/           # Phase 1 output (/sp.plan command)
└── tasks.md             # Phase 2 output (/sp.tasks command - NOT created by /sp.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── api/
│   │   ├── v1/
│   │   │   ├── auth.py
│   │   │   ├── documents.py
│   │   │   ├── rag.py
│   │   │   ├── generate.py
│   │   │   ├── voice.py          # Phase 2: voice transcription + synthesis
│   │   │   └── subscriptions.py
│   ├── models/
│   ├── services/
│   │   ├── auth/
│   │   ├── rag/
│   │   ├── ocr/                  # OCR pipeline service
│   │   ├── documents/
│   │   ├── voice/                # Phase 2: speech-to-text, Phase 3: text-to-speech
│   │   └── subscriptions/
│   └── config.py
├── tests/
│   ├── integration/
│   ├── unit/
│   └── contract/
├── requirements.txt
└── pyproject.toml

frontend/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   ├── (dashboard)/
│   │   ├── documents/
│   │   └── admin/
│   ├── components/
│   │   ├── auth/
│   │   ├── documents/
│   │   └── common/
│   └── lib/
├── next.config.js
├── tsconfig.json
└── package.json

mobile/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   ├── (tabs)/
│   │   ├── generate/
│   │   ├── documents/
│   │   └── profile/
│   ├── components/
│   │   ├── auth/
│   │   ├── generate/
│   │   ├── voice/                # Phase 2: VoiceInput component
│   │   ├── documents/
│   │   └── common/
│   └── lib/
├── app.json
├── package.json
└── babel.config.js

shared/
├── src/
│   ├── api/
│   └── types/
└── package.json
```

**Structure Decision**: Full-stack mobile-first approach with separate backend (FastAPI), frontend (Next.js admin), mobile (React Native primary), and shared libraries. OCR and voice services are isolated service modules in the backend. Voice UI components are mobile-only.

## Phase Completion Status

**Phase 0: Research & Discovery** ✅ COMPLETED (Updated 2026-03-22)
- Researched 10 key technical decisions:
  1. LangGraph vs OpenAI Agents SDK → LangGraph
  2. React Native bare vs Expo → React Native bare
  3. Supabase vs self-hosted PostgreSQL → Supabase free tier
  4. PDF/DOCX generation libraries → ReportLab + python-docx
  5. Embedding model → multilingual-e5-base (upgraded from all-MiniLM-L6-v2)
  6. SMS/OTP provider → Twilio + Jazzy API
  7. OCR engine → Tesseract (primary) + EasyOCR (Urdu/Sindhi fallback)
  8. Multilingual support → multilingual-e5-base + UrduText + Nastaliq fonts
  9. Speech-to-text API → OpenAI Whisper (multilingual Urdu/Sindhi support) [NEW]
  10. Text-to-speech → Google Cloud TTS / Azure Neural TTS for Urdu/Sindhi [NEW]

**Phase 1: Design & Contracts** ✅ COMPLETED (Updated 2026-03-22)
- Updated data-model.md with OCR fields, voice session entity, output_language field
- Updated OpenAPI contract with voice endpoints and multilingual conversation endpoint
- Updated quickstart.md with new environment variables for OCR and voice services

**Next Phase**: `/sp.tasks` to regenerate implementation tasks from updated plan

## Complexity Tracking

No constitution violations identified. All 7 constitution principles successfully integrated including new OCR and voice capabilities.
