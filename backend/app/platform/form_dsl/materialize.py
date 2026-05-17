"""Materialize a TemplateDefinition into form_nodes rows for any owner."""

from __future__ import annotations

from typing import Any

import msgspec
from sqlalchemy.ext.asyncio import AsyncSession

from app.platform.form_dsl.enums import FormNodeKind
from app.platform.form_dsl.models import FormNode
from app.platform.form_dsl.schema import FieldDef, Section, Subsection, TemplateDefinition


async def materialize_form_response(
    transaction: AsyncSession,
    owner: Any,
    owner_type: str,
    definition: dict | TemplateDefinition,
) -> int:
    """Walk `definition` and insert one FormNode per template node under
    `(owner_type, owner.id)`. Repeater shells are inserted; instances are
    created at runtime. Returns the template version, so the caller can pin
    it on the owner."""

    defn = definition if isinstance(definition, TemplateDefinition) else msgspec.convert(definition, TemplateDefinition)

    order = 0
    for field in defn.survey_metadata_fields:
        transaction.add(_field_node(owner, owner_type, parent_id=None, field=field, sort_order=order))
        order += 1

    for section_index, section in enumerate(defn.sections):
        section_node = _section_node(owner, owner_type, section=section, sort_order=section_index)
        transaction.add(section_node)
        await transaction.flush()

        for sub_index, sub in enumerate(section.subsections):
            sub_node = _subsection_node(owner, owner_type, parent_id=section_node.id, sub=sub, sort_order=sub_index)
            transaction.add(sub_node)
            await transaction.flush()

            for field_index, field in enumerate(sub.fields):
                transaction.add(
                    _field_node(owner, owner_type, parent_id=sub_node.id, field=field, sort_order=field_index)
                )

    return defn.version


def _section_node(owner: Any, owner_type: str, *, section: Section, sort_order: int) -> FormNode:
    return FormNode(
        organization_id=owner.organization_id,
        owner_type=owner_type,
        owner_id=owner.id,
        parent_id=None,
        kind=FormNodeKind.section,
        schema_ref=section.id,
        label=section.title,
        config={"condition": msgspec.to_builtins(section.condition)} if section.condition else None,
        sort_order=sort_order,
    )


def _subsection_node(owner: Any, owner_type: str, *, parent_id: int, sub: Subsection, sort_order: int) -> FormNode:
    return FormNode(
        organization_id=owner.organization_id,
        owner_type=owner_type,
        owner_id=owner.id,
        parent_id=parent_id,
        kind=FormNodeKind.subsection,
        schema_ref=sub.id,
        label=sub.title,
        sort_order=sort_order,
    )


def _field_node(
    owner: Any,
    owner_type: str,
    *,
    parent_id: int | None,
    field: FieldDef,
    sort_order: int,
) -> FormNode:
    return FormNode(
        organization_id=owner.organization_id,
        owner_type=owner_type,
        owner_id=owner.id,
        parent_id=parent_id,
        kind=FormNodeKind.field,
        schema_ref=field.id,
        label=field.label,
        value=None,
        config=msgspec.to_builtins(field),
        sort_order=sort_order,
    )
