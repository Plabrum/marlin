"""Demo org fixtures: nightly reset task + CLI entrypoint for `just fixtures`."""

from __future__ import annotations

import logging
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.platform.queue.enums import TaskName
from app.platform.queue.registry import scheduled_task, task
from app.platform.queue.transactions import with_transaction
from app.platform.queue.types import AppContext

from .seed import seed_demo_org
from .wipe import wipe_demo_org

logger = logging.getLogger(__name__)


@scheduled_task("0 8 * * *")
@task(TaskName.RESET_DEMO_ORG)
@with_transaction
async def reset_demo_org_task(ctx: AppContext, *, transaction: AsyncSession) -> dict[str, Any]:
    wiped = await wipe_demo_org(transaction)
    await seed_demo_org(transaction)
    logger.info(f"Demo org reset (wiped_existing={wiped})")
    return {"status": "reset", "wiped_existing": wiped}


async def run_fixtures_standalone() -> None:
    """Run wipe + seed from the CLI (`just fixtures`). Dev only — prod uses
    the scheduled task above."""
    from sqlalchemy import text  # noqa: PLC0415
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine  # noqa: PLC0415

    from app.config import config  # noqa: PLC0415
    from app.utils.discovery import discover_and_import  # noqa: PLC0415

    if config.ENV == "production":
        raise SystemExit("Refusing to seed from CLI: ENV=production (use the scheduled task)")

    discover_and_import(["models.py", "models/**/*.py"], base_path="app")

    engine = create_async_engine(config.ASYNC_DATABASE_URL)
    sessionmaker = async_sessionmaker(engine, expire_on_commit=False)

    async with sessionmaker() as session:
        async with session.begin():
            await session.execute(text("SET LOCAL app.is_system_mode = true"))
            wiped = await wipe_demo_org(session)
            if wiped:
                logger.info("Wiped existing demo org")
            await seed_demo_org(session)

    await engine.dispose()
    logger.info("Fixture seed finished")


if __name__ == "__main__":
    import asyncio

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    asyncio.run(run_fixtures_standalone())
