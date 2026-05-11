"""Email thread model — groups related inbound and outbound messages per user."""

from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.platform.base.models import BaseDBModel
from app.platform.base.rls_mixins import UserScopedMixin
from app.utils.sqids import Sqid, SqidType


class EmailThread(UserScopedMixin, BaseDBModel):
    __tablename__ = "email_threads"

    user_id: Mapped[Sqid] = mapped_column(
        SqidType,
        sa.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    subject: Mapped[str | None] = mapped_column(sa.Text)
    archived_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), index=True)

    client_id: Mapped[Sqid | None] = mapped_column(
        SqidType,
        sa.ForeignKey("clients.id", ondelete="SET NULL"),
        index=True,
    )
    survey_id: Mapped[Sqid | None] = mapped_column(
        SqidType,
        sa.ForeignKey("surveys.id", ondelete="SET NULL"),
        index=True,
    )
