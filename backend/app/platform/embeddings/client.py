"""Embedding clients — one per provider, swappable behind BaseEmbeddingClient."""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod

from openai import AsyncOpenAI

from app.config import config

logger = logging.getLogger(__name__)


class BaseEmbeddingClient(ABC):
    model: str
    dim: int

    @abstractmethod
    async def embed(self, texts: list[str]) -> list[list[float]]: ...


class LocalEmbeddingClient(BaseEmbeddingClient):
    """Dev/test stub — returns deterministic zero vectors."""

    model = "local-dev"
    dim = 1536

    async def embed(self, texts: list[str]) -> list[list[float]]:
        logger.info(f"[dev] embed called for {len(texts)} input(s) — returning zero vectors")
        return [[0.0] * self.dim for _ in texts]


class OpenAIEmbeddingClient(BaseEmbeddingClient):
    """OpenAI text-embedding-3-small (1536 dims).

    Batches up to OpenAI's 2048-input limit; we cap at 100 to keep payloads
    small. text-embedding-3-large is a single-class change here if we upgrade.
    """

    DIM_BY_MODEL: dict[str, int] = {
        "text-embedding-3-small": 1536,
        "text-embedding-3-large": 3072,
    }

    def __init__(self, api_key: str | None = None, model: str | None = None) -> None:
        self._client = AsyncOpenAI(api_key=api_key or config.OPENAI_API_KEY)
        self.model = model or config.EMBEDDING_MODEL
        self.dim = self.DIM_BY_MODEL.get(self.model, 1536)

    async def embed(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        out: list[list[float]] = []
        for i in range(0, len(texts), 100):
            batch = texts[i : i + 100]
            resp = await self._client.embeddings.create(model=self.model, input=batch)
            out.extend(item.embedding for item in resp.data)
        return out
