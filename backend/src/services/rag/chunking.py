"""DocumentChunkingService: split document text into RAG-ready chunks with metadata."""
from typing import Any, Dict, List, Optional

import structlog

logger = structlog.get_logger(__name__)

_DEFAULT_CHUNK_SIZE = 512   # tokens (approx characters ÷ 4)
_DEFAULT_OVERLAP = 50       # tokens of overlap between consecutive chunks


def _estimate_tokens(text: str) -> int:
    """Rough token estimate: ~4 chars per token for multilingual text."""
    return max(1, len(text) // 4)


def _char_limit(token_limit: int) -> int:
    return token_limit * 4


class DocumentChunkingService:
    """Split approved document text into overlapping chunks suitable for embedding.

    Chunk boundaries respect paragraph/sentence breaks where possible.
    Each chunk carries metadata: source document, page number, language, section.
    """

    def __init__(
        self,
        chunk_size_tokens: int = _DEFAULT_CHUNK_SIZE,
        overlap_tokens: int = _DEFAULT_OVERLAP,
    ) -> None:
        self._chunk_chars = _char_limit(chunk_size_tokens)
        self._overlap_chars = _char_limit(overlap_tokens)

    def chunk_document(
        self,
        text: str,
        document_id: str,
        domain_namespace: str,
        language: str = "english",
        is_ocr_derived: bool = False,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """Split `text` into overlapping chunks and return chunk dicts.

        Each returned dict has:
          - chunk_text: str
          - chunk_index: int
          - document_id: str
          - domain_namespace: str
          - language: str
          - is_ocr_derived: bool
          - metadata: dict (page, section, etc.)
        """
        if not text or not text.strip():
            logger.warning("empty_document_text", document_id=document_id)
            return []

        chunks = self._split_text(text)
        result = []
        base_metadata = metadata or {}
        for i, chunk_text in enumerate(chunks):
            result.append({
                "chunk_text": chunk_text,
                "chunk_index": i,
                "document_id": document_id,
                "domain_namespace": domain_namespace,
                "language": language,
                "is_ocr_derived": is_ocr_derived,
                "metadata": {**base_metadata, "chunk_index": i},
            })

        logger.info(
            "document_chunked",
            document_id=document_id,
            chunk_count=len(result),
            language=language,
        )
        return result

    def chunk_pages(
        self,
        pages: List[Dict[str, Any]],
        document_id: str,
        domain_namespace: str,
        base_language: str = "english",
    ) -> List[Dict[str, Any]]:
        """Chunk a list of page dicts (each with 'page_num', 'text', 'language', 'is_ocr').

        Per-page language overrides `base_language` if present.
        """
        all_chunks = []
        for page in pages:
            page_text = page.get("text", "").strip()
            if not page_text:
                continue
            page_lang = page.get("language", base_language)
            page_is_ocr = page.get("is_ocr", False)
            page_num = page.get("page_num", 0)
            page_chunks = self.chunk_document(
                text=page_text,
                document_id=document_id,
                domain_namespace=domain_namespace,
                language=page_lang,
                is_ocr_derived=page_is_ocr,
                metadata={"page_num": page_num},
            )
            # Re-index chunks globally across pages
            offset = len(all_chunks)
            for chunk in page_chunks:
                chunk["chunk_index"] = offset + chunk["chunk_index"]
            all_chunks.extend(page_chunks)

        return all_chunks

    def _split_text(self, text: str) -> List[str]:
        """Split text into overlapping character windows, breaking at paragraph/newline."""
        if len(text) <= self._chunk_chars:
            return [text.strip()]

        chunks: List[str] = []
        start = 0
        while start < len(text):
            end = min(start + self._chunk_chars, len(text))
            # Try to break at a paragraph or sentence boundary
            if end < len(text):
                for sep in ("\n\n", "\n", "۔", ".", "؟", "!", "?"):
                    last_sep = text.rfind(sep, start + self._overlap_chars, end)
                    if last_sep > start:
                        end = last_sep + len(sep)
                        break
            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            if end >= len(text):
                break
            start = end - self._overlap_chars

        return chunks
