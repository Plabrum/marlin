"""unify_subsection_into_group_field

Collapses the `subsection` FormNode kind and the `Subsection` template-schema
concept into an ordinary field with `config.type == 'group'`. Rewrites both
`survey_templates.definition` JSONB (subsections -> group fields) and
`form_nodes` rows (kind='subsection' -> kind='field' with a synthesized
group config). Ships in the same deploy as the `FieldType.GROUP` /
`FormNodeKind.subsection` removal — no dual-path support.

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-07-02 00:01:00.000000+00:00

"""

from typing import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op

revision: str = "b2c3d4e5f6a7"
down_revision: str | None = "a1b2c3d4e5f6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_BATCH_SIZE = 500


def _subsections_to_group_fields(section: dict) -> dict:
    subsections = section.pop("subsections", [])
    for sub in subsections:
        section["fields"].append(
            {
                "id": sub["id"],
                "label": sub["title"],
                "type": "group",
                "fields": sub["fields"],
                "required": False,
                "allow_finding": True,
                "config": {},
            }
        )
    return section


def _group_fields_to_subsections(section: dict) -> dict:
    kept_fields = []
    subsections = []
    for field in section.get("fields", []):
        if field.get("type") == "group":
            subsections.append({"id": field["id"], "title": field["label"], "fields": field.get("fields", [])})
        else:
            kept_fields.append(field)
    section["fields"] = kept_fields
    section["subsections"] = subsections
    return section


def upgrade() -> None:
    conn = op.get_bind()

    rows = conn.execute(
        sa.text("SELECT id, definition FROM survey_templates WHERE definition::text LIKE '%subsections%'")
    ).fetchall()
    for row in rows:
        definition = row.definition
        for section in definition.get("sections", []):
            _subsections_to_group_fields(section)
        conn.execute(
            sa.text("UPDATE survey_templates SET definition = :definition WHERE id = :id").bindparams(
                sa.bindparam("definition", type_=JSONB)
            ),
            {"definition": definition, "id": row.id},
        )

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
    conn = op.get_bind()

    while True:
        rows = conn.execute(
            sa.text(
                "SELECT id FROM form_nodes WHERE kind = 'field' AND config->>'type' = 'group' "
                "AND parent_id IN (SELECT id FROM form_nodes WHERE kind = 'section') LIMIT :limit"
            ),
            {"limit": _BATCH_SIZE},
        ).fetchall()
        if not rows:
            break
        ids = [row.id for row in rows]
        conn.execute(
            sa.text("UPDATE form_nodes SET kind = 'subsection', config = NULL WHERE id = ANY(:ids)").bindparams(
                sa.bindparam("ids", type_=sa.ARRAY(sa.BigInteger))
            ),
            {"ids": ids},
        )

    rows = conn.execute(
        sa.text('SELECT id, definition FROM survey_templates WHERE definition::text LIKE \'%"type": "group"%\'')
    ).fetchall()
    for row in rows:
        definition = row.definition
        for section in definition.get("sections", []):
            _group_fields_to_subsections(section)
        conn.execute(
            sa.text("UPDATE survey_templates SET definition = :definition WHERE id = :id").bindparams(
                sa.bindparam("definition", type_=JSONB)
            ),
            {"definition": definition, "id": row.id},
        )
