"""Embeddings platform — attach pgvector embeddings to any model via a mixin."""

from app.platform.embeddings.client import (
    BaseEmbeddingClient,
    LocalEmbeddingClient,
    OpenAIEmbeddingClient,
)
from app.platform.embeddings.mixin import EmbeddableMixin
from app.platform.embeddings.query import nearest

__all__ = [
    "BaseEmbeddingClient",
    "EmbeddableMixin",
    "LocalEmbeddingClient",
    "OpenAIEmbeddingClient",
    "nearest",
]
