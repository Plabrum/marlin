from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.platform.base.models import BaseDBModel, TimestampMixin
from app.platform.base.rls_mixins import UserScopedMixin
from app.utils.sqids import Sqid, SqidType


class Dashboard(UserScopedMixin, TimestampMixin, BaseDBModel):
    __tablename__ = "dashboards"

    user_id: Mapped[Sqid] = mapped_column(
        SqidType,
        sa.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    config: Mapped[dict] = mapped_column(
        JSONB,
        server_default=sa.text("'{\"widgets\": []}'::jsonb"),
        nullable=False,
    )
