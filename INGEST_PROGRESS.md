# Ingestion Pipeline Debug Progress

**Date:** 2026-03-22
**Branch:** `001-rag-document-intelligence`
**Goal:** Get `backend/ingest.py` to embed 3 approved documents into ChromaDB without crashing.

---

## System State

| Resource | Value |
|---|---|
| RAM | 15 GB total, ~14 GB available — NOT the issue |
| Root `/` disk | 41 GB total, **1.2 GB free (97% full)** — SUSPECT |
| External `/media/riaz/New Volume` | 417 GB total, 43 GB free |
| ChromaDB data path | `/media/riaz/New Volume/zero-cost setup/chroma_data` |
| ONNX model cache | `~/.cache/chroma/onnx_models/all-MiniLM-L6-v2/onnx/` (88 MB, on root `/`) |
| Python venv | `/media/riaz/New Volume/zero-cost setup/venv/prompt-backend` |

---

## Documents to Ingest (3 approved)

| Doc ID | File | Namespace |
|---|---|---|
| `fdeaaf6b-...` | `constitution.pdf` (222 pages, 0 OCR) | `legal_pk` |
| (2nd doc) | unknown | unknown |
| (3rd doc) | unknown | unknown |

---

## Root Cause Identified (2 issues, both fixed in code)

### Issue 1 — RESOLVED: ONNX model not cached
- **Symptom:** `collection.add()` crashed silently — ChromaDB tried to download the ONNX model on first embed call, SSL handshake timed out, killed the process.
- **Fix:** Manually downloaded `onnx.tar.gz` (80 MB) from `https://chroma-onnx-models.s3.amazonaws.com/all-MiniLM-L6-v2/onnx.tar.gz` and extracted to `~/.cache/chroma/onnx_models/all-MiniLM-L6-v2/`.
- **Verified:** `ef(['test sentence'])` returns 384-dim vector, `collection.add()` of 1 doc works.

### Issue 2 — UNSOLVED: Terminal still crashes after ONNX fix
- **Symptom:** Process dies after exactly 2 `document_chunked` log entries (page 0 and page 1 of constitution.pdf). No exception, no traceback — terminal window closes.
- **Crash point:** During `chunk_pages()` loop (pure Python, no native libs) OR at first `collection.add()` — unclear which.
- **Suspects (ranked):**
  1. **Root disk full (1.2 GB free)** — onnxruntime/SQLite/Python may write temp files to `/tmp` or `~/.cache` on `/`. With 87 MB model already loaded + SQLite WAL + Python bytecache, could be exhausting root. **Most likely.**
  2. **ChromaDB SQLite metadata** — stored on root (`~/.cache/chroma/` or default location), not on external drive.
  3. **onnxruntime writes to `/tmp`** during first batch inference.

---

## Files Changed

| File | Change |
|---|---|
| `backend/src/db/chromadb_client.py` | Switched from `SentenceTransformerEmbeddingFunction` (PyTorch) to `ONNXMiniLM_L6_V2`; added `_get_embedding_function()` singleton |
| `backend/src/services/rag/ingestion.py` | Removed `EmbeddingService`; pass `documents=` (text) to `collection.add()` so ChromaDB auto-embeds via ONNX |
| `backend/src/services/rag/retrieval.py` | Changed `query_embeddings=[vector]` to `query_texts=[query]` to match ONNX auto-embed approach |
| `backend/ingest.py` | Full rewrite: standalone CLI, no PyTorch thread setup, Tee stdout→log, per-doc gc.collect() |

---

## Disk Cleanup Done (2026-03-22)

| Action | Space Freed |
|---|---|
| Deleted `/tmp/onnx.tar.gz` | 80 MB |
| Moved `~/.cache/huggingface` → external + symlink | 665 MB |
| Moved `~/.cache/chroma` → external + symlink | 88 MB |
| `pip cache purge` | 142 MB |
| Moved `~/.local/lib/python3.14` → external + symlink | **8 GB** |
| **Root disk after** | **11 GB free (75% used)** |

All symlinks confirmed working — Python/ChromaDB still resolve paths transparently.

## Next Steps to Try (in order)

### Step 1 — RUN INGEST (disk is now clear)
```bash
cd /home/riaz/Desktop/prompt/backend
source /media/riaz/New\ Volume/zero-cost\ setup/venv/prompt-backend/bin/activate
python ingest.py
# Watch: tail -f /tmp/ingest.log
```

### Step 2 (if still crashes) — REDUCE BATCH SIZE
In `backend/src/services/rag/ingestion.py`, line 14:
```python
_INSERT_BATCH_SIZE = 5   # reduce from 50
```

### Step 3 (if still crashes) — REDIRECT TMPDIR to external drive
```bash
export TMPDIR="/media/riaz/New Volume/zero-cost setup/tmp"
mkdir -p "$TMPDIR"
python ingest.py
```

### Step 4 (if still crashes) — CATCH THE SIGNAL
```bash
strace -f -e trace=signal python ingest.py 2>&1 | grep -E "SIG|kill|exit" | tail -20
```

---

## Verified Working

- [x] ONNX model downloaded and cached at `~/.cache/chroma/onnx_models/all-MiniLM-L6-v2/onnx/`
- [x] `_get_embedding_function()` loads model and returns 384-dim vectors
- [x] Single `collection.add()` call succeeds
- [x] Text extraction: 222 pages extracted, 0 OCR for constitution.pdf
- [x] Chunking service: pure Python, no native deps
- [x] Full ingest of all 3 documents — **772 vectors in ChromaDB** ✓

---

## Commands to Run Ingest

```bash
cd /home/riaz/Desktop/prompt/backend
source /media/riaz/New\ Volume/zero-cost\ setup/venv/prompt-backend/bin/activate
python ingest.py
# Log tailed live: tail -f /tmp/ingest.log
```

Or for a single doc:
```bash
python ingest.py fdeaaf6b-b2b4-4653-b21d-9a6757ac8168
```
