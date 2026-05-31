# Document Extraction Platform

## Purpose

A small, opinionated framework for turning a document (text, PDF, image) into typed records that domain code can consume. An extraction is a **tree of typed extractors**: each node declares its msgspec schema, its lookup-or-create logic, and (optionally) child extractors for nested domain objects. The top extractor owns one LLM call against the composed schema; the tree walks the parsed output and writes domain records through normal actions.

The first consumer is **historic survey import** (user forwards a PDF survey to `surveys@sloopquest.com` → a completed `Survey` + linked `Vessel` + `Manufacturer` + matched-or-created `SurveyTemplate` materializes in their workspace). The same framework is intended to back future extractors (invoices, work orders, sailing resumes) without re-architecting.

## Non-goals

- **Not a workflow engine.** No durable steps, no replay, no checkpoints. Tasks are transactional via the existing `task_transaction` wrapper — that's enough. External cost on retry is bounded by LLM-response caching later, not by step-level checkpointing.
- **Not user-configurable.** Extractors are Python classes authored by engineers. No UI builder, no YAML, no DB-defined extractors.
- **Not multi-turn agentic.** One LLM call per top-level extract. The schema is a tagged tree; the LLM fills it in one shot.
- **Not an ingress router.** How the document arrives is the caller's problem (an SAQ task, an admin tool, a test). The extraction platform doesn't know about email, S3, or SES.
- **Not a generic action layer.** Extractors call existing domain actions (`get_or_create_manufacturer`, `create_survey`, …). They don't have a parallel persistence path.

## Architecture

### `BaseExtractor`

```python
class BaseExtractor[TSchema: Struct, TModel: BaseDBModel]:
    schema: type[TSchema]
    model: type[TModel]
    prompt: str  # extractor-owned, used when this extractor is a top

    async def extract(
        self, transaction: AsyncSession, document: Document
    ) -> TModel:
        """Top-level entry: do the LLM call, then run."""
        parsed = await llm_extract(document, schema=self.schema, prompt=self.prompt)
        return await self.run(transaction, parsed)

    async def run(self, transaction: AsyncSession, data: TSchema) -> TModel:
        """Inner entry: lookup-or-create against pre-parsed data. No LLM."""
        if existing := await self.lookup(transaction, data):
            return existing
        return await self.create(transaction, data)

    async def lookup(
        self, transaction: AsyncSession, data: TSchema
    ) -> TModel | None:
        return None  # default: always create

    async def create(self, transaction: AsyncSession, data: TSchema) -> TModel:
        ...  # extractors override; wires children explicitly via typed attribute access
```

Two entry points: `extract(document)` runs the LLM and then runs the tree; `run(parsed_data)` skips the LLM and is used both for child invocations inside other extractors' `create` and for programmatic callers (tests, admin tools, future CSV importers).

**Composition is explicit, not declarative.** A parent's `create` calls child extractors directly using typed attribute access — `await VesselExtractor().run(transaction, data.vessel)`. No `children` dict, no schema-field introspection, no `getattr`. The schema fields are real msgspec attributes; treat them as such. Children's `extract` is never called inside a tree run — only `run`.

**Any extractor can be a top.** `VesselExtractor().extract(invoice_text)` is a valid standalone call. The framework doesn't distinguish "top" from "child" except by how it's invoked.

### `Document`

```python
@dataclass(frozen=True)
class Document:
    content: bytes | str
    mime: str  # "text/plain", "application/pdf", "image/png", ...

    @classmethod
    def from_text(cls, text: str) -> "Document": ...
    @classmethod
    def from_pdf(cls, bytes_: bytes) -> "Document": ...
```

The LLM adapter picks the provider based on mime (Anthropic for PDFs and images via native document blocks; either for text). Callers don't pick providers.

### `llm_extract`

```python
async def llm_extract[T: Struct](
    document: Document,
    schema: type[T],
    prompt: str,
    *,
    max_retries: int = 1,
) -> T:
    """One LLM call with strict structured output. Validates and returns the parsed Struct."""
```

Lives in `platform/llm/`. Owns provider selection, system prompt scaffolding, structured-output mode (Anthropic tool-use forcing or OpenAI `response_format=json_schema`), msgspec decode, and one retry on schema-validation failure. Nothing extractor-specific.

## Concrete example: historic survey import

### The extractor tree

```python
class ManufacturerSchema(Struct):
    name: str
    country: str | None = None


class ManufacturerExtractor(BaseExtractor[ManufacturerSchema, Manufacturer]):
    schema = ManufacturerSchema
    model = Manufacturer
    prompt = "Extract the boat manufacturer mentioned in the document."

    async def lookup(self, transaction, data):
        return await get_manufacturer_by_name(transaction, data.name)

    async def create(self, transaction, data):
        return await create_manufacturer(transaction, name=data.name, country=data.country)


class VesselSchema(Struct):
    make: str
    model: str
    year: int | None = None
    hin: str | None = None
    length_ft: float | None = None
    manufacturer: ManufacturerSchema | None = None


class VesselExtractor(BaseExtractor[VesselSchema, Vessel]):
    schema = VesselSchema
    model = Vessel
    prompt = "Extract the surveyed vessel's identity."

    async def lookup(self, transaction, data):
        if data.hin:
            if existing := await get_vessel_by_hin(transaction, data.hin):
                return existing
        return None  # fall through to create

    async def create(self, transaction, data):
        manufacturer = (
            await ManufacturerExtractor().run(transaction, data.manufacturer)
            if data.manufacturer is not None
            else None
        )
        return await create_vessel(
            transaction,
            make=data.make, model=data.model, year=data.year,
            hin=data.hin, length_ft=data.length_ft,
            manufacturer=manufacturer,
        )


class TemplateSectionSchema(Struct):
    name: str
    field_names: list[str]


class TemplateSchema(Struct):
    name: str
    sections: list[TemplateSectionSchema]


class SurveyTemplateExtractor(BaseExtractor[TemplateSchema, SurveyTemplate]):
    schema = TemplateSchema
    model = SurveyTemplate
    prompt = "Extract the template structure (sections and the fields under each)."

    async def lookup(self, transaction, data):
        return await find_matching_template(transaction, data)  # see Template matching

    async def create(self, transaction, data):
        return await create_template(transaction, name=data.name, sections=data.sections)


class ClientSchema(Struct):
    name: str
    email: str | None = None
    phone: str | None = None


class ClientExtractor(BaseExtractor[ClientSchema, Client]):
    schema = ClientSchema
    model = Client
    prompt = "Extract the client (vessel owner) information."

    async def lookup(self, transaction, data):
        if data.email:
            return await get_client_by_email(transaction, data.email)
        return await get_client_by_name(transaction, data.name)

    async def create(self, transaction, data):
        return await create_client(
            transaction, name=data.name, email=data.email, phone=data.phone,
        )


class SurveyResponseSchema(Struct):
    section_name: str
    field_name: str
    value: str


class SurveySchema(Struct):
    client: ClientSchema
    vessel: VesselSchema
    template: TemplateSchema
    responses: list[SurveyResponseSchema]
    surveyor: str | None = None
    surveyed_on: date | None = None
    location: str | None = None


class SurveyExtractor(BaseExtractor[SurveySchema, Survey]):
    schema = SurveySchema
    model = Survey
    prompt = SURVEY_EXTRACTION_PROMPT  # the substantive prompt

    async def create(self, transaction, data):
        client = await ClientExtractor().run(transaction, data.client)
        vessel = await VesselExtractor().run(transaction, data.vessel)
        template = await SurveyTemplateExtractor().run(transaction, data.template)
        await link_vessel_to_client(transaction, vessel=vessel, client=client)
        survey = await create_survey(
            transaction,
            client=client, vessel=vessel, template=template,
            surveyor=data.surveyor, surveyed_on=data.surveyed_on, location=data.location,
            source=SurveySource.IMPORTED,
            state=SurveyState.COMPLETED,
        )
        await transaction.flush()  # survey.id populated for response inserts
        await bulk_set_responses(transaction, survey, data.responses)
        return survey
```

**Top-level siblings are the common shape, not the exception.** A document often yields several independent domain objects that need linking after the fact — here, a `Client`, a `Vessel`, and a `SurveyTemplate` all live as siblings on `SurveySchema`. The pattern:

- Each sibling is its own nested schema and its own extractor.
- The parent's `create` resolves them via individual `await ChildExtractor().run(transaction, data.field)` calls, in **dependency order** (client first so vessel can be linked to it).
- **Cross-sibling linking happens in the parent's `create`**, not inside any child extractor. `link_vessel_to_client` and `create_survey(client=..., vessel=..., template=...)` wire the relationships. Child extractors stay context-free — `run(transaction, data)` is the only signature they ever see.

This deliberately keeps `run` pure. The schema field is the contract; if a child extractor needed to know "who's the client" to do its lookup, that's a sign the child belongs nested under the client, not as a sibling.

**`SurveyResponseSchema` is not its own extractor.** Responses have no independent lookup-or-create — they're just data attached to a Survey. The line between "use a child extractor" and "handle inline" is: does this thing have its own table with lookup semantics? Client/Vessel/Manufacturer/Template yes; SurveyResponse no.

### Trust and state

Survey imports land in `SurveyState.COMPLETED` with `Survey.source = IMPORTED`. The user forwarded a PDF because the survey was *already done* — the email is the end of the surveyor's process, not the start. Auto-completing matches user expectation.

UI affordance: surveys with `source = IMPORTED` show a banner ("auto-imported from PDF — review fields") until the user dismisses it. No state-machine state, just a flag + UI treatment. The platform doesn't own the banner; the domain does.

**Mutation policy on lookup match.** If `lookup` returns an existing record, the framework short-circuits creation. Extracted data that conflicts with the existing record (e.g., new `length_ft` for a Vessel matched by HIN) is silently ignored. We never let LLM output overwrite real data. If we ever want a "proposed change" surface, that's its own future feature; v1 ignores deltas.

## Template matching

This is the load-bearing correctness piece, and the most likely thing to break in production.

### What we're matching

The question is *"was this survey instance produced from an existing template in the workspace, modulo optional/blank sections, or is the structure genuinely new?"*

### Algorithm

`find_matching_template(transaction, data: TemplateSchema)`:

1. **Narrow via embedding.** Query the embeddings platform: `nearest(transaction, SurveyTemplate, embed_text, k=5)` where `embed_text = data.name + "\n" + "\n".join(s.name for s in data.sections)`. RLS scopes to workspace. The embedded text on each `SurveyTemplate` follows the same shape (already supported via `EmbeddableMixin`).
2. **Subset check the candidates.** For each candidate template `T`:
   - Normalize section names (lowercase, strip punctuation).
   - Compute `extracted ⊆ T.sections` allowing fuzzy match (Levenshtein ≤ 2) per section name.
   - If every extracted section maps to a section in `T`, the candidate is a fit. Score = `len(T.sections) - len(matched)` (lower = fewer unused `T` sections = tighter fit).
3. **Pick the best fit.** Lowest-score fit above some `max_unused` threshold wins. If no candidate fits, return `None` and let the framework call `create`.

### Threshold tuning

- Embedding `k=5` is the candidate-narrowing window. Bigger if a workspace has lots of templates and we miss matches; smaller if compute matters.
- `max_unused = ceil(T.sections * 0.5)` is the floor for a fit — a template with 12 sections matches a survey that filled at least 6 of them. Tune from real imports.
- Fuzzy section-name distance `≤ 2` handles typos and casing; loose enough breaks specificity.

All thresholds live in config, not constants in code.

### What we never do

- We never **update** an existing template based on an imported survey. A template is a workspace artifact; extraction can match it or not, but can't grow it.
- We never **merge** templates as a side effect of matching. Merging happens in a future admin tool, not in extraction.
- We never **silently bias** toward the user's most-recent template; the algorithm is structural, not temporal.

### Failure mode to expect

The user has Template A and Template B with overlapping sections (catamaran vs monohull survey, say). A monohull import might match A's structure and get filed as A. The fix is not better matching — it's a UI affordance for "this survey was matched to Template A; reassign to Template B" after the fact. Worth knowing this can happen and not trying to solve it perfectly in the matcher.

## The caller: survey import task

The extraction platform doesn't know about email. The caller does.

```python
@async_event_consumer(
    EventType.CREATED,
    model=Message,
    filter=is_survey_import_email,
)
@with_transaction(role_type=TaskRoleType.USER)
async def import_survey_from_email(
    transaction: AsyncSession, event: Event, message: Message
) -> None:
    for idx, attachment in enumerate(message.pdf_attachments):
        await dispatch_task(
            transaction, ...,
            task_name=TaskName.IMPORT_SURVEY_FROM_PDF,
            message_id=message.id, attachment_index=idx,
        )


@task(TaskName.IMPORT_SURVEY_FROM_PDF)
@with_transaction(role_type=TaskRoleType.USER)
async def import_survey_from_pdf_task(
    ctx, transaction, message_id: int, attachment_index: int, user_id: int
):
    message = await get_message(transaction, message_id)
    attachment = message.attachments_json[attachment_index]
    pdf_bytes = await s3_download(attachment["s3_bucket"], attachment["s3_key"])
    document = Document.from_pdf(pdf_bytes)

    try:
        survey = await SurveyExtractor().extract(transaction, document)
    except ExtractionFailed as e:
        await send_extraction_failure_reply(transaction, message, attachment, reason=str(e))
        raise

    await send_survey_imported_reply(transaction, message, survey)
```

**Routing.** `is_survey_import_email` checks `to_email == "surveys@sloopquest.com"`, `from_email` matches a `User`, and at least one PDF attachment exists. The matched user's org becomes the workspace via `TaskRoleType.USER` — RLS handles scoping for every downstream `get_or_create_*` / `create_*` call. No manual `workspace_id=` plumbing.

**Idempotency.** `(message_id, attachment_index)` is the natural dedupe key. SAQ task uniqueness or an idempotency column on `surveys` keyed by `(workspace_id, source_message_id, source_attachment_index)` — implementation detail of the survey domain, not the extraction platform.

**Multi-attachment.** Fan out one task per PDF. Each task is independent; failures are per-PDF.

## Failure handling

Three failure modes:

1. **LLM call fails or returns invalid schema (after retry).** `llm_extract` raises `ExtractionFailed`. Caller catches → sends an auto-reply to the sender ("we couldn't read this PDF") with the original PDF attached and an opaque support reference (task id). Task is marked failed by SAQ. No automatic re-extraction.
2. **Lookup or create raises (constraint violation, RLS denial, missing FK).** Bubbles up; task transaction rolls back; nothing partial. Same auto-reply path. These are bugs, not user errors — log loudly.
3. **Schema valid but data is garbage** (LLM hallucinated a Vessel with `make="?"`). Not caught by the platform. The Survey lands as COMPLETED with bad data and the user has to clean up. The `IMPORTED` source flag is the only protection. Acceptable for v1; revisit if dogfooding shows >20% of imports need substantive correction.

## File layout

```
backend/app/platform/extraction/
  __init__.py
  base.py                  # BaseExtractor, Document, ExtractionFailed
backend/app/platform/llm/
  extract.py               # llm_extract(document, schema, prompt)

backend/app/domain/manufacturers/
  extractor.py             # ManufacturerExtractor, ManufacturerSchema
backend/app/domain/vessels/
  extractor.py             # VesselExtractor, VesselSchema
backend/app/domain/surveys/
  extractor.py             # SurveyExtractor, SurveyTemplateExtractor, SurveySchema, TemplateSchema
  import_task.py           # SAQ task + event consumer
  import_replies.py        # auto-reply email builders
```

The platform is ~150 lines (base class, Document, LLM adapter). Everything domain-specific lives in `domain/`. Adding a future extractor (`InvoiceExtractor`) means writing a new `domain/invoices/extractor.py` and a caller; no platform changes.

## Open questions

1. **`length_ft` (and other numeric fields) on existing Vessel match.** Spec says we ignore extracted deltas. But length is rarely wrong — maybe always-true fields like length, year, HIN should warn loudly when they disagree (Slack or log) so we notice when extraction is producing wrong data. Defer until first wrong-match incident.
2. **Standalone-vs-child prompts.** `VesselExtractor.prompt` is "Extract the surveyed vessel's identity." When `VesselExtractor` is a child of `SurveyExtractor`, the prompt isn't used (top extractor's prompt drives the call). Should the field be `standalone_prompt` to make this explicit? Yes, probably — rename before merging.
3. **Embedding text shape for `SurveyTemplate`.** The doc proposes `name + sections.name`. If section names are too generic ("General", "Notes"), embeddings cluster badly. Worth checking after the first ~20 imports.
4. **Auto-reply templates.** `send_extraction_failure_reply` and `send_survey_imported_reply` need actual copy. Out of scope for this doc; tracked alongside the comms templates.

## What's deliberately deferred

- **`ExtractionJob` / state tracking table.** Tasks are transactional and idempotent at the action layer; the task either succeeds atomically or fails atomically. No reason for a state table yet.
- **Replay infra.** Tasks can be re-enqueued; no per-step persisted outputs. If LLM-call cost on retry hurts, add a response cache keyed by `(model, prompt_hash, document_hash)` — that's a `platform/llm/` concern, not extraction's.
- **Multi-turn / agentic extraction.** Single-shot structured output covers v1. If we hit a case that genuinely needs runtime feedback (e.g., "ask the user which client this is for"), add a sibling pattern then; don't try to make `BaseExtractor` multi-turn.
- **Generic extractor registry.** No `@extractor("survey_import")` decorator, no router. The caller knows which extractor to call. When we have three extractors and a real reason to route by document type, revisit.
- **List children.** `children: dict[str, type[BaseExtractor]]` only supports 1:1. "Extract three invoices from one PDF" needs list semantics; v1 survey import doesn't.
- **Mutation-on-match.** Lookup hits return existing record as-is. Proposed-change surface is a future feature.
- **Trust modes (draft / review_only).** Survey imports auto-complete by design. If a future extractor needs drafts, it can return its created record in a draft state — that's a domain concern, not a platform concern.

## Roll-out

1. Land `platform/extraction/base.py` + `platform/llm/extract.py` with tests but no domain extractors yet.
2. Land `ManufacturerExtractor` + `VesselExtractor` + their domain action helpers. Test in isolation with hand-rolled schemas (no LLM yet, just `run()`).
3. Land `SurveyTemplateExtractor` + the template-matching algorithm. Unit-test the subset matcher against a few hand-built template fixtures.
4. Land `SurveyExtractor` + the SAQ task + the event-consumer filter. Behind a feature flag (`SURVEY_IMPORT_ENABLED`).
5. Dogfood: forward 10 historic surveys. Tune prompts, template-match thresholds, and auto-reply copy. Iterate via re-forwarding (each forward = fresh attempt; idempotency dedupes on message_id).
6. Lift the feature flag.
7. Resist building a second extractor for at least four weeks after lift. The platform's joints need to absorb one extractor's quirks before we generalize against a second.

## What this spec is honest about

- We're building a small framework for one use case and one likely-next use case. The abstraction is light enough to throw away if a different shape turns out to fit better.
- Template matching is the biggest correctness risk. We have a plan, but it will get tuned in production, not before.
- LLM-extracted data will be wrong sometimes. We mitigate with provenance (`source = IMPORTED`) and a UI affordance, not with elaborate review flows.
- The platform owns the LLM call and the tree walk. It does *not* own ingress, persistence, idempotency, scoping, or notification. Those live where they already live.
