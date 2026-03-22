---
id: "0016"
title: Fix ingestion pipeline crashes
stage: green
date: 2026-03-22
surface: agent
model: claude-sonnet-4-6
feature: 001-rag-document-intelligence
branch: 001-rag-document-intelligence
user: riaz
command: debug ingest.py crash
labels: ["bug", "onnx", "chromadb", "disk", "ingestion", "infinite-loop"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - backend/src/services/rag/chunking.py
  - backend/src/db/chromadb_client.py
  - backend/src/services/rag/ingestion.py
  - backend/src/services/rag/retrieval.py
  - backend/ingest.py
  - INGEST_PROGRESS.md
tests:
  - manual: python ingest.py — 3 docs, 772 vectors, no crash
---

## Prompt

again crashed, now create a progress upto now file, so we dont miss the path exactly and progress accordingly to follow that progress for improvement not crashing

(prior context: ingest.py crashed silently every run, terminal window closed, no traceback)

## Response snapshot

Diagnosed 5 root causes in sequence and fixed all:

1. **ONNX model not cached** — ChromaDB tried to download `all-MiniLM-L6-v2` on first embed call; SSL handshake timed out and killed the process. Fixed by manually downloading + extracting to `~/.cache/chroma/onnx_models/all-MiniLM-L6-v2/onnx/`.

2. **Root disk 97% full (1.2 GB free)** — onnxruntime/SQLite/Python needed temp space during inference. Freed ~9 GB by moving `~/.local/lib/python3.14` (8 GB PyTorch/nvidia), HuggingFace cache, ChromaDB model cache, and pip cache to external drive (`/media/riaz/New Volume`), each with symlinks.

3. **Infinite loop in `_split_text()`** — THE REAL BUG. When processing any page > 2048 chars, the loop set `start = end - overlap_chars` after the last chunk, but `start < len(text)` remained True forever, generating infinite duplicate chunks until OOM kill. Fix: `if end >= len(text): break` instead of `if start >= len(text): break` (the old check never fires since `end - 200 < len(text)` always).

4. **Stale ChromaDB collection** — `domain_legal_pk` was created with `sentence_transformer` embedding function; switching to ONNX caused a conflict error. Fixed by deleting old collections so they are recreated with the ONNX function.

5. **Invalid enum value** — `ingest.py` tried to set `status = "indexed"` but the `document_status` enum only has `pending | approved | rejected`. Removed the invalid status update.

## Outcome

- ✅ Impact: All 3 approved documents ingested — 772 vectors in ChromaDB `domain_legal_pk` collection
- 🧪 Tests: Manual end-to-end run of `python ingest.py` — completed without crash
- 📁 Files: chunking.py (infinite loop fix), chromadb_client.py (ONNX switch), ingestion.py (ONNX auto-embed), retrieval.py (query_texts), ingest.py (CLI rewrite + status fix)
- 🔁 Next prompts: Test RAG retrieval API endpoint; add `"indexed"` to document_status enum in a new migration
- 🧠 Reflection: The infinite loop was the root crash cause from the start. All other issues (disk, ONNX download) were real but secondary — they caused OOM before the infinite loop could even start generating chunks.

## Evaluation notes (flywheel)

- Failure modes observed: Silent process kill with no traceback; OOM kill before Python exception handler runs; stale ChromaDB collection blocking recreation; missing enum value in DB schema
- Graders run and results (PASS/FAIL): manual ingest run PASS (772 vectors)
- Prompt variant (if applicable): null
- Next experiment: Add `"indexed"` to `document_status` enum via migration so ingest.py can mark processed docs
