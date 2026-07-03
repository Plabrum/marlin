"""repair_leftover_subsection_form_nodes

The `b2c3d4e5f6a7` migration converted `kind='subsection'` form_nodes to
`kind='field'` (config.type == 'group') at the time it ran, but rows
materialized afterward from templates that still carried a `subsections`
list (e.g. stale template definitions written by out-of-date app code)
kept writing the removed `subsection` kind. `FormNodeKind` no longer has
that member, so reads 500 with `KeyError: 'subsection'`. This repeats the
same conversion for whatever is left over; it's a no-op if nothing matches.

Revision ID: d3e4f5a6b7c8
Revises: c232d2314624
Create Date: 2026-07-03 12:00:00.000000+00:00

"""

from typing import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "d3e4f5a6b7c8"
down_revision: str | None = "c232d2314624"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_BATCH_SIZE = 500


def upgrade() -> None:
    conn = op.get_bind()

    while True:
        rows = conn.execute(
            sa.text("SELECT id, schema_ref, label FROM form_nodes WHERE kind = 'subsection' LIMIT :limit"),
            {"limit": _BATCH_SIZE},
        ).fetchall()
        if not rows:
            break
        for row in rows:
            group_id = row.schema_ref or f"grp_{row.id}"
            conn.execute(
                sa.text(
                    "UPDATE form_nodes SET kind = 'field', config = jsonb_build_object("
                    "'id', :group_id, 'label', :label, 'type', 'group', 'fields', '[]'::jsonb, "
                    "'required', false, 'allow_finding', true, 'config', '{}'::jsonb"
                    ") WHERE id = :id"
                ),
                {"group_id": group_id, "label": row.label, "id": row.id},
            )


def downgrade() -> None:
    pass
