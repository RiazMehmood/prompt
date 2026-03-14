"""Document chunking service for RAG."""
import re


class ChunkingService:
    """Document chunking service with overlap."""

    @staticmethod
    def chunk_text(
        text: str,
        chunk_size: int = 512,
        overlap: int = 50
    ) -> list[str]:
        """Chunk text into overlapping segments.

        Args:
            text: Text to chunk
            chunk_size: Target chunk size in tokens (approximate)
            overlap: Overlap size in tokens

        Returns:
            List of text chunks
        """
        # Simple word-based chunking (approximate tokens)
        words = text.split()
        chunks = []

        i = 0
        while i < len(words):
            # Take chunk_size words
            chunk_words = words[i:i + chunk_size]
            chunk = " ".join(chunk_words)
            chunks.append(chunk)

            # Move forward by (chunk_size - overlap)
            i += (chunk_size - overlap)

        return chunks

    @staticmethod
    def chunk_by_paragraphs(text: str, max_chunk_size: int = 512) -> list[str]:
        """Chunk text by paragraphs, respecting max size.

        Args:
            text: Text to chunk
            max_chunk_size: Maximum chunk size in words

        Returns:
            List of text chunks
        """
        # Split by double newlines (paragraphs)
        paragraphs = re.split(r'\n\s*\n', text)
        chunks = []
        current_chunk = []
        current_size = 0

        for para in paragraphs:
            para_words = para.split()
            para_size = len(para_words)

            if current_size + para_size <= max_chunk_size:
                current_chunk.append(para)
                current_size += para_size
            else:
                # Save current chunk
                if current_chunk:
                    chunks.append("\n\n".join(current_chunk))

                # Start new chunk
                current_chunk = [para]
                current_size = para_size

        # Add remaining chunk
        if current_chunk:
            chunks.append("\n\n".join(current_chunk))

        return chunks
