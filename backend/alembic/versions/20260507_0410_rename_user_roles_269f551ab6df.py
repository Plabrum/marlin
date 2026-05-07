"""rename_user_roles

Revision ID: 269f551ab6df
Revises: b1c2d3e4f5a6
Create Date: 2026-05-07 04:10:56.554287+00:00

"""

from typing import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "269f551ab6df"
down_revision: str | None = "b1c2d3e4f5a6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_index(op.f("ix_invoices_state"), "invoices", ["state"], unique=False)

    # Rename role values: admin→superadmin, surveyor→admin, client→member
    # Order matters: rename admin first so it doesn't collide with surveyor→admin
    op.execute("UPDATE users SET role = 'superadmin' WHERE role = 'admin'")
    op.execute("UPDATE users SET role = 'admin' WHERE role = 'surveyor'")
    op.execute("UPDATE users SET role = 'member' WHERE role = 'client'")

    op.alter_column("users", "role", server_default="member")


def downgrade() -> None:
    op.drop_index(op.f("ix_invoices_state"), table_name="invoices")

    op.execute("UPDATE users SET role = 'client' WHERE role = 'member'")
    op.execute("UPDATE users SET role = 'surveyor' WHERE role = 'admin'")
    op.execute("UPDATE users SET role = 'admin' WHERE role = 'superadmin'")

    op.alter_column("users", "role", server_default="client")
