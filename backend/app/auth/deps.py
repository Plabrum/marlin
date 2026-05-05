from typing import Any

from litestar import Request
from litestar.exceptions import NotAuthorizedException
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.service import AuthService
from app.comms.service.emails import EmailService
from app.config import config
from app.users.models import User
from app.users.service import UserService
from app.utils.deps import dep


@dep("user", sync_to_thread=False)
def provide_current_user(request: Request[User | None, Any, Any]) -> User:
    if request.user is None:
        raise NotAuthorizedException()
    return request.user


@dep("auth_service", sync_to_thread=False)
def provide_auth_service(
    transaction: AsyncSession,
    user_service: UserService,
    email_service: EmailService,
) -> AuthService:
    return AuthService(transaction, user_service, email_service, config=config)
