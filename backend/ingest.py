"""Standalone ingestion CLI — run with the server STOPPED.

Usage (from backend/ directory):
    python ingest.py                  # ingest all approved docs
    python ingest.py <doc_id>         # ingest one specific document

Progress is written to stdout AND /tmp/ingest.log
"""
import asyncio
import gc
import sys

from dotenv import load_dotenv
load_dotenv(".env")

import structlog
structlog.configure(wrapper_class=structlog.make_filtering_bound_logger(20))


async def ingest_doc(doc_id: str, file_path: str, namespace: str) -> None:
    from src.services.documents.text_extraction import TextExtractionService
    from src.services.rag.ingestion import EmbeddingIngestionService
    from src.db.supabase_client import get_supabase_admin

    admin = get_supabase_admin()
    print(f"\n{'='*60}", flush=True)
    print(f"File     : {file_path.split('_', 1)[-1]}", flush=True)
    print(f"ID       : {doc_id}", flush=True)
    print(f"Namespace: {namespace}", flush=True)
    print(f"{'='*60}", flush=True)

    try:
        print("1/3 Extracting text...", flush=True)
        pages = TextExtractionService().extract_pdf(file_path)
        print(f"    {len(pages)} pages ({sum(1 for p in pages if p['is_ocr'])} OCR)", flush=True)

        print("2/3 Embedding + inserting into ChromaDB (ONNX, no PyTorch)...", flush=True)
        chunks = await EmbeddingIngestionService().ingest_document(doc_id, namespace, pages)
        print(f"    {chunks} chunks indexed", flush=True)

        del pages
        gc.collect()

        print("3/3 Done — status stays 'approved' (no 'indexed' in enum)", flush=True)
        print(f"DONE", flush=True)

    except Exception as exc:
        print(f"ERROR: {exc}", flush=True)
        import traceback; traceback.print_exc()
        raise


async def main() -> None:
    from src.db.supabase_client import get_supabase_admin
    admin = get_supabase_admin()

    specific_id = sys.argv[1] if len(sys.argv) > 1 else None

    if specific_id:
        resp = admin.table("documents").select(
            "id, filename, file_path, domain_id, status"
        ).eq("id", specific_id).single().execute()
        docs = [resp.data] if resp.data else []
    else:
        resp = admin.table("documents").select(
            "id, filename, file_path, domain_id, status"
        ).eq("status", "approved").execute()
        docs = resp.data or []

    if not docs:
        print("No approved documents to ingest.")
        return

    print(f"Found {len(docs)} document(s) to ingest.")

    for doc in docs:
        domain_resp = admin.table("domains").select("knowledge_base_namespace").eq(
            "id", doc["domain_id"]
        ).single().execute()
        namespace = (domain_resp.data or {}).get("knowledge_base_namespace") or doc["domain_id"]
        await ingest_doc(doc["id"], doc["file_path"], namespace)
        gc.collect()

    from src.db.chromadb_client import get_collection_count
    print(f"\nChromaDB vectors in '{namespace}': {get_collection_count(namespace)}")
    print("Done. Restart the server when ready.")


if __name__ == "__main__":
    import os
    log_file = open("/tmp/ingest.log", "w", buffering=1)
    # Tee output to both terminal and log file
    class Tee:
        def __init__(self, *files): self.files = files
        def write(self, data):
            for f in self.files: f.write(data)
        def flush(self):
            for f in self.files: f.flush()
    sys.stdout = Tee(sys.__stdout__, log_file)
    sys.stderr = Tee(sys.__stderr__, log_file)

    asyncio.run(main())
