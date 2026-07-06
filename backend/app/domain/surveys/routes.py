from __future__ import annotations

import msgspec
from litestar import Router, get, post
from litestar.exceptions import NotFoundException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.config import config
from app.domain.surveys import queries as survey_queries
from app.domain.surveys.models import Survey, SurveyMedia, SurveyTemplate
from app.domain.surveys.schemas import (
    AdHocSuggestion,
    AdHocSuggestionsResponse,
    SurveyDetail,
    SurveyFormNodeRef,
    SurveyListItem,
    SurveyMediaDetail,
    SurveyMediaListItem,
    SurveyTemplateDetail,
    SurveyTemplateListItem,
)
from app.domain.users.models import User
from app.platform.actions.deps import ActionDeps
from app.platform.actions.registry import ActionRegistry
from app.platform.auth.guards import requires_session
from app.platform.base.crud import CRUDConfig, CRUDEntry, CRUDRegistry, _crud_metadata, make_crud_controller
from app.platform.base.schemas import EntityRef, ListRequest, PagedResponse
from app.platform.clients.s3 import BaseS3Client
from app.platform.data.enums import FieldType
from app.platform.data.service import FieldConfig
from app.platform.form_dsl.conditions import resolve_visibility, section_completion
from app.platform.form_dsl.enums import FormNodeKind
from app.platform.form_dsl.models import FormNode
from app.platform.form_dsl.schema import TemplateDefinition
from app.platform.form_dsl.schemas import SectionCompletion
from app.utils.sqids import Sqid


def _to_survey_list_item(survey: Survey, user: User) -> SurveyListItem:
    return SurveyListItem(
        id=survey.id,
        state=survey.state,
        vessel=EntityRef(
            id=survey.vessel_id,
            label=survey.vessel.name,
            href=f"/vessels/{survey.vessel_id}",
        ),
        surveyor=EntityRef(
            id=survey.assigned_surveyor_id,
            label=survey.assigned_surveyor.name,
            href=f"/users/{survey.assigned_surveyor_id}",
        ),
        created_at=survey.created_at,
    )


def _to_form_node_ref(
    node: FormNode,
    visibility: dict[int, bool],
    media_by_node: dict[int, list[SurveyMediaListItem]],
    findings_by_parent: dict[int, list[SurveyFormNodeRef]],
    action_deps: ActionDeps | None,
) -> SurveyFormNodeRef:
    actions: list = []
    if action_deps is not None:
        group = ActionRegistry().find_by_model(FormNode)
        if group is not None:
            actions = group.get_available_actions(action_deps, node)
    return SurveyFormNodeRef(
        id=node.id,
        parent_id=node.parent_id,
        kind=node.kind,
        schema_ref=node.schema_ref,
        label=node.label,
        value=node.value,
        config=node.config,
        sort_order=node.sort_order,
        condition_visible=visibility.get(node.id),
        attached_media=media_by_node.get(node.id, []),
        findings=findings_by_parent.get(node.id, []),
        actions=actions,
    )


def _to_survey_detail(survey: Survey, user: User, action_deps: ActionDeps | None = None) -> SurveyDetail:
    # crud.py's detail_handler always resolves `action_deps` via real DI for any
    # authenticated route (see provide_action_deps) — it's never actually None
    # here. The `| None = None` only exists so this function stays structurally
    # assignable to CRUDConfig.to_detail's `Callable[[ModelT, User], DetailT]`.
    assert action_deps is not None
    template_ref = (
        EntityRef(
            id=survey.template.id,
            label=survey.template.name,
            href=f"/survey-templates/{survey.template.id}",
        )
        if survey.template is not None
        else None
    )
    visibility = resolve_visibility(survey.form_nodes)

    media_by_node: dict[int, list[SurveyMediaListItem]] = {}
    unassigned_media: list[SurveyMediaListItem] = []
    for sm in survey.survey_media:
        item = _survey_media_to_item(sm, user, action_deps.s3)
        if sm.node_id is None:
            unassigned_media.append(item)
        else:
            media_by_node.setdefault(sm.node_id, []).append(item)

    # First pass: build refs for annotation (finding) nodes so structural nodes
    # can embed them in a second pass.
    annotations = [n for n in survey.form_nodes if n.kind == FormNodeKind.annotation]
    structural = [n for n in survey.form_nodes if n.kind != FormNodeKind.annotation]
    findings_by_parent: dict[int, list[SurveyFormNodeRef]] = {}
    for n in sorted(annotations, key=lambda n: n.sort_order):
        if n.parent_id is None:
            continue
        ref = _to_form_node_ref(n, visibility, media_by_node, {}, action_deps)
        findings_by_parent.setdefault(n.parent_id, []).append(ref)

    return SurveyDetail(
        id=survey.id,
        state=survey.state,
        vessel=EntityRef(
            id=survey.vessel_id,
            label=survey.vessel.name,
            href=f"/vessels/{survey.vessel_id}",
        ),
        surveyor=EntityRef(
            id=survey.assigned_surveyor_id,
            label=survey.assigned_surveyor.name,
            href=f"/users/{survey.assigned_surveyor_id}",
        ),
        template=template_ref,
        template_version=survey.template_version,
        form_nodes=[
            _to_form_node_ref(n, visibility, media_by_node, findings_by_parent, action_deps)
            for n in sorted(structural, key=lambda n: (n.parent_id or 0, n.sort_order))
        ],
        unassigned_media=unassigned_media,
        section_completion=[
            SectionCompletion(section_id=Sqid(sid), filled=v["filled"], total=v["total"])
            for sid, v in section_completion(survey.form_nodes).items()
        ],
    )


_survey_config = CRUDConfig(
    model=Survey,
    to_list_item=_to_survey_list_item,
    to_detail=_to_survey_detail,
    list_load_options=[joinedload(Survey.vessel), joinedload(Survey.assigned_surveyor)],
    detail_load_options=[
        joinedload(Survey.vessel),
        joinedload(Survey.assigned_surveyor),
        joinedload(Survey.template),
        joinedload(Survey.form_nodes),
        joinedload(Survey.survey_media).joinedload(SurveyMedia.media),
    ],
    filterable_columns={"state", "vessel_id", "assigned_surveyor_id", "created_at"},
    sortable_columns={"created_at"},
    label_field="state",
    data_fields=[
        FieldConfig("state", "Status", FieldType.ENUM),
        FieldConfig("created_at", "Created", FieldType.DATETIME, aggregatable=False),
    ],
)

_survey_controller = make_crud_controller("", _survey_config)


_AD_HOC_PROMOTE_THRESHOLD = 3


@get("/ad-hoc-suggestions")
async def list_ad_hoc_suggestions(
    transaction: AsyncSession,
    user: User,
) -> AdHocSuggestionsResponse:
    rows = await survey_queries.list_ad_hoc_suggestions(transaction, promote_threshold=_AD_HOC_PROMOTE_THRESHOLD)
    suggestions = [
        AdHocSuggestion(label=row.label, type=row.field_type or "text", count=row.survey_count) for row in rows
    ]
    return AdHocSuggestionsResponse(threshold=_AD_HOC_PROMOTE_THRESHOLD, suggestions=suggestions)


survey_router = Router(
    path="/surveys",
    route_handlers=[_survey_controller, list_ad_hoc_suggestions],
    tags=["surveys"],
)


def _to_template_list_item(template: SurveyTemplate, user: User) -> SurveyTemplateListItem:
    return SurveyTemplateListItem(id=template.id, name=template.name, tags=template.tags)


def _to_template_detail(template: SurveyTemplate, user: User) -> SurveyTemplateDetail:
    return SurveyTemplateDetail(
        id=template.id,
        name=template.name,
        tags=template.tags,
        definition=msgspec.convert(template.definition, TemplateDefinition),
    )


_template_config = CRUDConfig(
    model=SurveyTemplate,
    to_list_item=_to_template_list_item,
    to_detail=_to_template_detail,
    filterable_columns={"name", "created_at"},
    sortable_columns={"name", "created_at"},
    label_field="name",
)

_template_controller = make_crud_controller("", _template_config)

survey_template_router = Router(
    path="/survey-templates", route_handlers=[_template_controller], tags=["survey-templates"]
)


# ── SurveyMedia ────────────────────────────────────────────────────────────────
#
# SurveyMedia's list/detail transformers need a genuinely request-scoped
# `s3_client` to generate presigned URLs — something make_crud_controller's
# fixed `(obj, user)` transformer signature can't provide (its generated
# handlers call transformers as plain functions, not through Litestar DI).
# So SurveyMedia gets hand-written handlers below instead of
# make_crud_controller, replicating that factory's behavior exactly (same
# route paths/operation IDs/guards/filtering/sorting/pagination/action
# hydration) so the OpenAPI spec — and therefore Orval codegen — is unaffected.


def _survey_media_to_item(sm: SurveyMedia, user: User, s3_client: BaseS3Client) -> SurveyMediaListItem:
    view_url = s3_client.generate_presigned_download_url(
        bucket=config.S3_MEDIA_BUCKET, key=sm.media.file_key, expires_in=3600
    )
    thumbnail_url = (
        s3_client.generate_presigned_download_url(
            bucket=config.S3_MEDIA_BUCKET, key=sm.media.thumbnail_key, expires_in=3600
        )
        if sm.media.thumbnail_key
        else None
    )
    return SurveyMediaListItem(
        id=sm.id,
        survey_id=sm.survey_id,
        media_id=sm.media_id,
        node_id=sm.node_id,
        caption=sm.caption,
        sort_order=sm.sort_order,
        file_name=sm.media.file_name,
        file_type=sm.media.file_type,
        mime_type=sm.media.mime_type,
        view_url=view_url,
        thumbnail_url=thumbnail_url,
    )


def _survey_media_to_detail(sm: SurveyMedia, user: User, s3_client: BaseS3Client) -> SurveyMediaDetail:
    item = _survey_media_to_item(sm, user, s3_client)
    return SurveyMediaDetail(**{f: getattr(item, f) for f in item.__struct_fields__})


# Metadata-only — never invoked. This CRUDConfig exists solely so we can reuse
# make_crud_controller's filter/load-option/metadata plumbing (below) instead
# of duplicating it; its to_list_item/to_detail fields just need to type-check.
def _survey_media_metadata_list_item(sm: SurveyMedia, user: User) -> SurveyMediaListItem:
    raise NotImplementedError


def _survey_media_metadata_detail(sm: SurveyMedia, user: User) -> SurveyMediaDetail:
    raise NotImplementedError


_survey_media_config = CRUDConfig(
    model=SurveyMedia,
    to_list_item=_survey_media_metadata_list_item,
    to_detail=_survey_media_metadata_detail,
    list_load_options=[joinedload(SurveyMedia.media)],
    detail_load_options=[joinedload(SurveyMedia.media)],
    filterable_columns={"survey_id", "node_id"},
    sortable_columns={"sort_order", "created_at"},
    default_sort="sort_order",
)


@post(
    "/",
    guards=[requires_session],
    tags=["surveymedia"],
    status_code=200,
    operation_id="list_SurveyMedia",
    summary="ListHandler",
)
async def _list_survey_media(
    data: ListRequest,
    user: User,
    transaction: AsyncSession,
    s3_client: BaseS3Client,
    action_deps: ActionDeps | None = None,
) -> PagedResponse[SurveyMediaListItem]:
    limit = max(1, min(data.limit, 200))
    offset = max(0, data.offset)

    rows, total = await survey_queries.list_survey_media(
        transaction,
        organization_id=user.organization_id,
        filters=data.filters,
        sorts=data.sorts,
        filterable_columns=_survey_media_config.filterable_columns,
        sortable_columns=_survey_media_config.sortable_columns,
        default_sort_column=_survey_media_config.default_sort or "created_at",
        load_options=_survey_media_config.list_load_options,
        limit=limit,
        offset=offset,
    )

    items = [_survey_media_to_item(row, user, s3_client) for row in rows]

    if action_deps is not None:
        action_group = ActionRegistry().find_by_model(SurveyMedia)
        if action_group is not None:
            for item, row in zip(items, rows, strict=True):
                item.actions = action_group.get_available_actions(action_deps, row)

    return PagedResponse(
        items=items,
        total=total,
        offset=offset,
        limit=limit,
        has_more=offset + len(items) < total,
    )


@get(
    "/{id:str}",
    guards=[requires_session],
    tags=["surveymedia"],
    operation_id="SurveyMediaIdDetailHandler",
    summary="DetailHandler",
)
async def _detail_survey_media(
    id: Sqid,
    user: User,
    transaction: AsyncSession,
    s3_client: BaseS3Client,
    action_deps: ActionDeps | None = None,
) -> SurveyMediaDetail:
    obj = await survey_queries.get_survey_media(
        transaction,
        id=id,
        organization_id=user.organization_id,
        load_options=_survey_media_config.detail_load_options,
    )
    if obj is None:
        raise NotFoundException()

    detail = _survey_media_to_detail(obj, user, s3_client)
    if action_deps is not None:
        action_group = ActionRegistry().find_by_model(SurveyMedia)
        if action_group is not None:
            detail.actions = action_group.get_available_actions(action_deps, obj)
    return detail


_crud_metadata["list_SurveyMedia"] = {
    "filterable": sorted(_survey_media_config.filterable_columns or []),
    "sortable": sorted(_survey_media_config.sortable_columns or []),
}
CRUDRegistry().register(SurveyMedia, CRUDEntry(path="", config=_survey_media_config))

survey_media_router = Router(
    path="/survey-media",
    # Registered detail-before-list to match the OpenAPI path ordering that
    # make_crud_controller previously produced (Litestar enumerates Controller
    # handler attributes alphabetically: "detail_handler" < "list_handler"),
    # keeping the generated orval output byte-identical.
    route_handlers=[_detail_survey_media, _list_survey_media],
    tags=["survey-media"],
)
