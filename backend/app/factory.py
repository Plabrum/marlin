from typing import Any

from advanced_alchemy.extensions.litestar import (
    AsyncSessionConfig,
    SQLAlchemyAsyncConfig,
    SQLAlchemyPlugin,
)
from litestar import Litestar
from litestar.channels import ChannelsPlugin
from litestar.channels.backends.memory import MemoryChannelsBackend
from litestar.config.cors import CORSConfig
from litestar.contrib.jinja import JinjaTemplateEngine
from litestar.template.config import TemplateConfig
from litestar_saq import QueueConfig, SAQConfig, SAQPlugin

from app.base.models import BaseDBModel
from app.config import Config

__all__ = ["BaseDBModel", "create_app"]


def create_app(config: Config) -> Litestar:
    """Create and configure the Litestar application."""

    cors_config = CORSConfig(
        allow_origins=[config.FRONTEND_ORIGIN],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"],
    )

    sqlalchemy_plugin = SQLAlchemyPlugin(
        config=SQLAlchemyAsyncConfig(
            connection_string=config.ASYNC_DATABASE_URL,
            metadata=BaseDBModel.metadata,
            session_config=AsyncSessionConfig(expire_on_commit=False, autoflush=False),
            create_all=False,
        )
    )

    template_config = TemplateConfig(
        directory=config.EMAIL_TEMPLATES_DIR,
        engine=JinjaTemplateEngine,
    )

    saq_plugin = SAQPlugin(
        config=SAQConfig(
            queue_configs=[QueueConfig(name="default", dsn=config.REDIS_URL)],
            web_enabled=config.IS_DEV,
            use_server_lifespan=True,
        )
    )

    channels_plugin = ChannelsPlugin(
        backend=MemoryChannelsBackend(),
        arbitrary_channels_allowed=True,
    )

    plugins: list[Any] = [sqlalchemy_plugin, saq_plugin, channels_plugin]

    return Litestar(
        route_handlers=[],
        plugins=plugins,
        cors_config=cors_config,
        template_config=template_config,
        debug=config.IS_DEV,
    )
