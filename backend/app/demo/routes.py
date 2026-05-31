"""Dev-only endpoint for switching between demo users without a magic link."""

import logging
import time
from dataclasses import dataclass

from litestar import Request, Router, post
from litestar.exceptions import NotFoundException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import undefer

from app.domain.onboarding.models import Onboarding
from app.domain.users.models import User
from app.domain.users.roles import Role
from app.platform.auth.routes import MeResponse

from .wipe import DEMO_ORG_ID

logger = logging.getLogger(__name__)

_ROLE_TO_EMAIL: dict[Role, str] = {
    Role.ADMIN: "demo@sloopquest.com",
    Role.MEMBER: "demo+member@sloopquest.com",
}


@dataclass
class SwitchRoleBody:
    role: str


@post("/switch-role", tags=["demo"], exclude_from_auth=True)
async def switch_role(
    data: SwitchRoleBody,
    request: Request,
    transaction: AsyncSession,
) -> MeResponse:
    """Set the session to a demo user by role. Dev only."""
    try:
        role = Role(data.role)
    except ValueError:
        raise NotFoundException(f"Unknown role: {data.role}") from None

    email = _ROLE_TO_EMAIL.get(role)
    if not email:
        raise NotFoundException(f"No demo user for role: {role}")

    user = (
        await transaction.execute(
            select(User)
            .options(undefer(User.is_onboarded))
            .where(User.email == email, User.organization_id == DEMO_ORG_ID)
        )
    ).scalar_one_or_none()

    if user is None:
        raise NotFoundException(f"Demo user not found: {email} — run `just fixtures` first")

    onboarding_state = await transaction.scalar(select(Onboarding.state).where(Onboarding.user_id == user.id))

    request.set_session({"user_id": int(user.id), "last_activity": time.time()})
    logger.info(f"Demo login → {role} ({email})")

    return MeResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        email_verified=user.email_verified,
        role=user.role,
        is_onboarded=user.is_onboarded,
        onboarding_state=onboarding_state,
    )


demo_router = Router(path="/demo", route_handlers=[switch_role], tags=["demo"])
