"""Shared WeasyPrint + Jinja2 PDF rendering primitives."""

from __future__ import annotations

import asyncio
from collections.abc import Callable
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, select_autoescape
from litestar.exceptions import InternalServerException

_RENDER_TIMEOUT_SECONDS = 30


def make_jinja_env(templates_dir: Path) -> Environment:
    return Environment(
        loader=FileSystemLoader(templates_dir),
        autoescape=select_autoescape(["html"]),
    )


def write_pdf(html_str: str) -> bytes:
    from weasyprint import HTML  # noqa: PLC0415

    pdf_bytes = HTML(string=html_str).write_pdf()
    assert pdf_bytes is not None  # `target=None` (the default) always returns bytes
    return pdf_bytes


async def render_pdf_in_thread(render_fn: Callable[..., bytes], **kwargs: Any) -> bytes:
    try:
        return await asyncio.wait_for(asyncio.to_thread(render_fn, **kwargs), timeout=_RENDER_TIMEOUT_SECONDS)
    except TimeoutError as e:
        raise InternalServerException("PDF rendering timed out") from e
