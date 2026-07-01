"""Embedding client dependency — module-level singleton."""

from app.config import config as app_config
from app.platform.embeddings.client import (
    BaseEmbeddingClient,
    LLMEmbeddingClient,
    LocalEmbeddingClient,
)
from app.platform.llm.deps import _voice_client
from app.utils.deps import dep

_use_openai = bool(app_config.OPENAI_API_KEY) and (not app_config.IS_DEV or app_config.USE_REAL_EMBEDDINGS)
_embedding_client: BaseEmbeddingClient = LLMEmbeddingClient(_voice_client) if _use_openai else LocalEmbeddingClient()


@dep("embedding_client")
def provide_embedding_client() -> BaseEmbeddingClient:
    return _embedding_client


def get_embedding_client() -> BaseEmbeddingClient:
    """For tasks that don't go through Litestar DI."""
    return _embedding_client
