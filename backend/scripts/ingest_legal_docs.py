#!/usr/bin/env python3
"""
Batch ingestion script for legal documents from Thatta Session Court.

Reads .doc/.docx files, extracts text, embeds into ChromaDB (legal_ns collection),
and creates approved records in the Supabase documents table.

Usage:
    python backend/scripts/ingest_legal_docs.py

Set CHROMADB_PATH and DATABASE_URL in backend/.env before running.
"""
import gc
import os
import subprocess
import sys
import tempfile
import uuid
from pathlib import Path
from datetime import datetime, timezone

# ── Path setup ────────────────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
sys.path.insert(0, str(BACKEND_DIR / "src"))

# Load .env
from dotenv import load_dotenv
load_dotenv(BACKEND_DIR / ".env")

# ── Config ────────────────────────────────────────────────────────────────────
DOCS_ROOT   = Path("/home/riaz/Desktop/legal document templets/office work")
CHROMA_PATH = os.environ.get("CHROMADB_PATH", "/media/riaz/New Volume/zero-cost setup/chroma_data")
NAMESPACE   = "legal_pk"            # domain_legal_pk collection
DOMAIN_ID   = "00000000-0000-0000-0000-000000000001"   # Legal domain UUID
ADMIN_ID    = "91c51d99-2eb8-42a7-9d54-fc07ccb2f56f"  # root_admin user id (uploaded_by)
DB_URL      = os.environ.get("SUPABASE_CONNECTION_STRING", "").strip('"')

# How many files to sample per top-level category (0 = unlimited)
SAMPLE_PER_CATEGORY = 80

# Categories to ingest (folder name → document_type enum value)
# Valid enum values: act, case_law, sample, textbook, protocol, standard
CATEGORIES = {
    "Civil Work":                "sample",
    "Criminal Work":             "sample",
    "Family Matters":            "sample",
    "Vakalatnama":               "standard",
    "Legal Notice":              "standard",
    "Guardians & Wards Matters": "sample",
    "Succession Matters":        "sample",
    "Revenue Appeals":           "sample",
    "Rent Matters":              "sample",
    "Direct Complaints":         "sample",
    "Free Will":                 "standard",
    "Illegal Dispossession":     "sample",
    "Special Power of Attorneys":"standard",
}

CHUNK_SIZE    = 600   # words per chunk
CHUNK_OVERLAP = 80    # word overlap between chunks
BATCH_SIZE    = 50    # ChromaDB add batch

# ── Text extraction ───────────────────────────────────────────────────────────

def extract_docx(path: Path) -> str:
    try:
        import docx
        doc = docx.Document(str(path))
        return "\n".join(p.text for p in doc.paragraphs if p.text.strip())
    except Exception as e:
        print(f"    [docx error] {path.name}: {e}")
        return ""

def extract_doc_via_libreoffice(path: Path) -> str:
    """Convert .doc → .txt via LibreOffice headless, return text."""
    try:
        with tempfile.TemporaryDirectory() as tmp:
            result = subprocess.run(
                ["libreoffice", "--headless", "--convert-to", "txt:Text", "--outdir", tmp, str(path)],
                capture_output=True, timeout=30
            )
            if result.returncode != 0:
                return ""
            txt_file = Path(tmp) / (path.stem + ".txt")
            if txt_file.exists():
                return txt_file.read_text(errors="replace").strip()
    except Exception as e:
        print(f"    [doc error] {path.name}: {e}")
    return ""

def extract_text(path: Path) -> str:
    ext = path.suffix.lower()
    if ext == ".docx":
        return extract_docx(path)
    elif ext == ".doc":
        return extract_doc_via_libreoffice(path)
    return ""

# ── Chunking ─────────────────────────────────────────────────────────────────

def chunk_text(text: str, doc_id: str, category: str) -> list[dict]:
    words = text.split()
    if not words:
        return []
    chunks = []
    step = CHUNK_SIZE - CHUNK_OVERLAP
    for i in range(0, len(words), step):
        chunk_words = words[i: i + CHUNK_SIZE]
        chunk_text  = " ".join(chunk_words).strip()
        if len(chunk_text) < 50:
            continue
        chunks.append({
            "id":       f"{doc_id}_{len(chunks)}",
            "text":     chunk_text,
            "metadata": {
                "document_id":       doc_id,
                "domain_namespace":  NAMESPACE,
                "chunk_index":       len(chunks),
                "language":          "english",
                "is_ocr_derived":    False,
                "category":          category,
            },
        })
    return chunks

# ── ChromaDB ──────────────────────────────────────────────────────────────────

def get_collection():
    import chromadb
    from chromadb.config import Settings as ChromaSettings
    from chromadb.utils.embedding_functions import ONNXMiniLM_L6_V2

    client = chromadb.PersistentClient(
        path=CHROMA_PATH,
        settings=ChromaSettings(anonymized_telemetry=False),
    )
    ef = ONNXMiniLM_L6_V2()
    collection = client.get_or_create_collection(
        name=f"domain_{NAMESPACE}",
        embedding_function=ef,
        metadata={"hnsw:space": "cosine", "domain_namespace": NAMESPACE},
    )
    return collection

# ── Supabase (direct psql via psycopg2) ───────────────────────────────────────

def get_db():
    import psycopg2
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = True
    return conn

def insert_document_record(cur, doc_id: str, filename: str, doc_type: str, file_size: int, file_path: str):
    cur.execute("""
        INSERT INTO documents (
            id, filename, file_path, file_size_bytes, mime_type,
            domain_id, document_type, status, uploaded_by,
            ocr_processed, ocr_confidence_avg,
            created_at, updated_at
        ) VALUES (
            %s, %s, %s, %s, %s,
            %s::uuid, %s, 'approved', %s::uuid,
            false, null,
            %s, %s
        )
        ON CONFLICT (id) DO NOTHING
    """, (
        doc_id, filename, file_path, file_size,
        "application/msword",
        DOMAIN_ID, doc_type, ADMIN_ID,
        datetime.now(timezone.utc),
        datetime.now(timezone.utc),
    ))

# ── Main ─────────────────────────────────────────────────────────────────────

def collect_files(category: str, max_count: int) -> list[Path]:
    cat_dir = DOCS_ROOT / category
    if not cat_dir.exists():
        return []
    files = [
        p for p in cat_dir.rglob("*")
        if p.suffix.lower() in (".doc", ".docx")
        and not p.name.startswith("~$")
        and p.stat().st_size > 2000      # skip near-empty files
    ]
    # Sort for reproducibility, sample evenly
    files.sort(key=lambda p: p.name)
    if max_count and len(files) > max_count:
        step = max(1, len(files) // max_count)
        files = files[::step][:max_count]
    return files

def main():
    print(f"\n{'='*60}")
    print(f"  Legal KB ingestion — Thatta Session Court documents")
    print(f"  ChromaDB: {CHROMA_PATH}")
    print(f"  Namespace: {NAMESPACE}")
    print(f"{'='*60}\n")

    print("Connecting to ChromaDB...", end=" ")
    collection = get_collection()
    existing_count = collection.count()
    print(f"ok  (existing vectors: {existing_count})")

    print("Connecting to database...", end=" ")
    conn = get_db()
    cur  = conn.cursor()
    print("ok\n")

    total_files    = 0
    total_chunks   = 0
    total_skipped  = 0
    total_errors   = 0

    for category, doc_type in CATEGORIES.items():
        files = collect_files(category, SAMPLE_PER_CATEGORY)
        if not files:
            print(f"  {category}: no files found, skipping")
            continue

        print(f"\n[{category}] ({len(files)} files → {doc_type})")

        cat_chunks = 0
        for i, fpath in enumerate(files):
            print(f"  [{i+1:3d}/{len(files)}] {fpath.name[:60]}", end=" ")

            # Extract text
            text = extract_text(fpath)
            if not text or len(text.split()) < 30:
                print("→ skip (too short)")
                total_skipped += 1
                continue

            doc_id = str(uuid.uuid4())
            chunks = chunk_text(text, doc_id, category)
            if not chunks:
                print("→ skip (no chunks)")
                total_skipped += 1
                continue

            # Add to ChromaDB in batches
            try:
                for b in range(0, len(chunks), BATCH_SIZE):
                    batch = chunks[b: b + BATCH_SIZE]
                    collection.add(
                        ids       =[c["id"]   for c in batch],
                        documents =[c["text"] for c in batch],
                        metadatas =[c["metadata"] for c in batch],
                    )
                    del batch
                    gc.collect()

                # Insert DB record (file_path = local filesystem path, not Supabase storage)
                insert_document_record(cur, doc_id, fpath.name, doc_type, fpath.stat().st_size, str(fpath))

                cat_chunks   += len(chunks)
                total_files  += 1
                print(f"→ {len(chunks)} chunks ✓")

            except Exception as e:
                print(f"→ ERROR: {e}")
                total_errors += 1

    cur.close()
    conn.close()

    final_count = collection.count()
    print(f"\n{'='*60}")
    print(f"  Done!")
    print(f"  Files ingested : {total_files}")
    print(f"  Files skipped  : {total_skipped}")
    print(f"  Errors         : {total_errors}")
    print(f"  Chunks added   : {total_chunks}")
    print(f"  Total vectors  : {final_count} (was {existing_count})")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
