from __future__ import annotations

from litestar import Router, get, post

from app.config import config
from app.domain.users.models import User
from app.domain.users.service import UserService
from app.platform.auth.guards import requires_session
from app.platform.base.crud import CRUDConfig, make_crud_controller
from app.platform.base.schemas import BaseSchema
from app.utils.sqids import Sqid


class UserListItem(BaseSchema):
    id: Sqid
    name: str
    email: str


def _to_user_list_item(user: User, _: User) -> UserListItem:
    return UserListItem(id=user.id, name=user.name, email=user.email)


_config = CRUDConfig(
    model=User,
    to_list_item=_to_user_list_item,
    to_detail=_to_user_list_item,
    label_field="name",
    expose_detail=False,
)

_controller = make_crud_controller("", _config)


class InboxAvailabilityResponse(BaseSchema):
    available: bool
    canonical: str
    reason: str | None = None


class InboxClaimRequest(BaseSchema):
    local_part: str


class InboxClaimResponse(BaseSchema):
    inbox_email: str


def _email_domain() -> str:
    return config.SES_FROM_EMAIL.rsplit("@", 1)[-1]


@get(
    "/inbox/available",
    guards=[requires_session],
    tags=["user"],
    operation_id="check_inbox_local_part_available",
)
async def check_inbox_available_handler(
    local_part: str,
    user_service: UserService,
) -> InboxAvailabilityResponse:
    available, canonical, reason = await user_service.is_inbox_local_part_available(local_part)
    return InboxAvailabilityResponse(available=available, canonical=canonical, reason=reason)


@post(
    "/me/inbox",
    guards=[requires_session],
    tags=["user"],
    operation_id="claim_inbox_local_part",
)
async def claim_inbox_handler(
    data: InboxClaimRequest,
    user: User,
    user_service: UserService,
) -> InboxClaimResponse:
    canonical = await user_service.claim_inbox_local_part(int(user.id), data.local_part)
    return InboxClaimResponse(inbox_email=f"{canonical}@{_email_domain()}")


user_router = Router(
    path="/users",
    route_handlers=[_controller, check_inbox_available_handler, claim_inbox_handler],
    tags=["user"],
)
