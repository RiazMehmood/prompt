"""ChromaDB client with collection-per-domain isolation and multilingual-e5-base embeddings.

Storage path is controlled entirely by the CHROMADB_PATH env var — change one line
in .env to move storage to any directory or mounted drive:

    CHROMADB_PATH=/media/riaz/New Volume/zero-cost setup/chroma_data   # external drive
    CHROMADB_PATH=./data/chromadb                                       # local dev fallback

No code change needed when switching storage locations.
"""
from functools import lru_cache

import chromadb
import structlog
from chromadb import Collection
from chromadb.config import Settings as ChromaSettings
from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction

from src.config import settings

logger = structlog.get_logger(__name__)

# Embedding function is module-level so it is instantiated once and shared across collections.
# To swap embedding models, change CHROMADB_EMBEDDING_MODEL in .env — no other code changes needed.
_EMBEDDING_FUNCTION = SentenceTransformerEmbeddingFunction(
    model_name=settings.CHROMADB_EMBEDDING_MODEL,
    normalize_embeddings=True,
)


@lru_cache(maxsize=1)
def get_chromadb_client() -> chromadb.PersistentClient:
    """Return the singleton ChromaDB persistent client.

    Storage location: settings.CHROMADB_PATH (from CHROMADB_PATH env var).
    Default for this project: /media/riaz/New Volume/zero-cost setup/chroma_data
    """
    client = chromadb.PersistentClient(
        path=settings.CHROMADB_PATH,
        settings=ChromaSettings(anonymized_telemetry=False),
    )
    logger.info("chromadb_client_ready", path=settings.CHROMADB_PATH)
    return client


def get_or_create_domain_collection(domain_namespace: str) -> Collection:
    """Get or create a ChromaDB collection for a domain namespace.

    Each domain has its own collection — this is the primary vector isolation mechanism.
    Collection name: ``domain_<namespace>`` (e.g. ``domain_legal_pk``).
    """
    client = get_chromadb_client()
    collection_name = f"domain_{domain_namespace}"
    collection = client.get_or_create_collection(
        name=collection_name,
        embedding_function=_EMBEDDING_FUNCTION,
        metadata={"hnsw:space": "cosine", "domain_namespace": domain_namespace},
    )
    logger.debug("domain_collection_ready", collection=collection_name)
    return collection


def delete_domain_collection(domain_namespace: str) -> bool:
    """Delete all vectors for a domain (called when a domain is deactivated)."""
    client = get_chromadb_client()
    collection_name = f"domain_{domain_namespace}"
    try:
        client.delete_collection(collection_name)
        logger.info("domain_collection_deleted", collection=collection_name)
        return True
    except Exception as exc:
        logger.error(
            "domain_collection_delete_failed",
            collection=collection_name,
            error=str(exc),
        )
        return False


def get_collection_count(domain_namespace: str) -> int:
    """Return the number of vectors stored for a domain namespace."""
    try:
        return get_or_create_domain_collection(domain_namespace).count()
    except Exception:
        return 0
