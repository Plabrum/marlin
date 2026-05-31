# Workflows Platform

## Purpose

A thin durability layer over the existing `platform/events` + `platform/queue` so async work that spans multiple steps can crash, retry, and resume without re-running expensive or non-idempotent side effects. Workflows are triggered by domain events (the existing event log) and execute as a sequence of **checkpointed steps**; each step persists its output before the next runs.

This is *not* a new dispatch system. Events still trigger work; SAQ still runs it. The new pieces are: a `workflow_runs` table, a `workflow_steps` table, and a `WorkflowContext.step(...)` helper.

## Defining examples

Two concrete workflows drive every design decision. If a feature isn't needed by one of these, it's deferred.

### Example A — Historic survey import (`import_survey_workflow`)

**Trigger:** `Message.CREATED` where `to_email == "surveys@sloopquest.com"` and at least one PDF attachment.
**Trust:** autocomplete — output is a final Survey.
**Shape:** linear, three LLM passes in parallel, one assembly step, one notify step.

```
fetch_pdf → [vessel_pass | metadata_pass | template_pass] → persist_survey → notify
```

### Example B — Inbox enrichment (`enrich_inbound_email_workflow`)

**Trigger:** `Message.CREATED` where the message is inbound to a *user's* connected inbox (not a system address) and is not part of an existing CRM thread.
**Trust:** draft — Customer may be auto-created (idempotent on email), Quote is always a draft pending user review.
**Shape:** cheap heuristic gate (sync consumer, not a workflow step) → classify intent → branch by intent → enrich.

```
classify_intent
  ├─ quote_request → resolve_or_create_customer → draft_quote → notify_user
  ├─ scheduling   → link_to_existing_customer → propose_times → notify_user
  └─ other        → no-op (workflow ends)
```

These two stress different joints: A is one intent / one output / autocomplete; B is N intents / many linked objects / draft + review. The platform must serve both *without* a feature B inherits from A that A doesn't need (or vice versa).

## What the platform owns

1. `workflow_runs` and `workflow_steps` tables.
2. `@workflow(trigger=..., serialize_on=..., trust=...)` decorator.
3. `WorkflowContext` injected into workflow bodies, with `ctx.step(key, fn, *args, **kwargs)`.
4. A SAQ task `RUN_WORKFLOW` that loads a run, executes the body, checkpoints step outputs.
5. Admin read routes: `GET /workflows/runs/:id` (run + steps + IO), `POST /workflows/runs/:id/steps/:key/retry`.

## What it doesn't own

- **Triggers** — those are existing `Event`s. A workflow registers as an async event consumer; the events platform decides when it fires.
- **Persistence of domain objects** — the consumer (workflow body) calls existing domain actions. There is no `save_workflow_output` path.
- **Draft review UI** — see [Trust + drafts](#trust--drafts). The platform exposes the state, the consumer's domain owns the UI.
- **Cron / scheduled triggers** — out of scope v1. If we need them, add a `scheduled_triggers` table later; do not bake `cron` into the workflow decorator.

## Tables

### `workflow_runs`

| field | purpose |
|---|---|
| `id` | sqid |
| `workflow_key` | matches a registered `@workflow` |
| `trigger_event_id` | FK to `events.id` (nullable for future manual / scheduled triggers) |
| `dedupe_key` | unique with `workflow_key`; prevents duplicate runs from re-delivered events |
| `serialize_key` | optional; runs sharing a `(workflow_key, serialize_key)` run one at a time |
| `state` | `pending → running → completed \| failed \| awaiting_review` |
| `input_json` | the resolved trigger payload (event + object snapshot) |
| `result_json` | the workflow body's final return value (typed by workflow) |
| `error_json` | structured failure |
| `attempts` | run-level attempt counter |
| `created_at` / `updated_at` |

Unique: `(workflow_key, dedupe_key)`.

### `workflow_steps`

| field | purpose |
|---|---|
| `id` | sqid |
| `run_id` | FK |
| `step_key` | explicit, author-chosen, unique per run |
| `state` | `pending → running → completed \| failed` |
| `input_json` | step args (for replay + debugging) |
| `output_json` | step return (`None` if not yet completed) |
| `error_json` | structured failure incl. traceback |
| `attempts` | step-level attempt counter |
| `idempotency_key` | passed-through key the step may use when calling actions |
| `started_at` / `completed_at` |

Unique: `(run_id, step_key)`.

## Decorator + context

```python
@workflow(
    trigger=on_event(EventType.CREATED, model=Message, filter=is_survey_inbox),
    dedupe_on=lambda event, obj: f"message:{obj.id}",
    trust=Trust.AUTOCOMPLETE,
)
async def import_survey_workflow(ctx: WorkflowContext, event: Event, message: Message) -> SurveyImportResult:
    pdf = await ctx.step("fetch_pdf", fetch_first_pdf_attachment, message.id)

    vessel, metadata, template = await asyncio.gather(
        ctx.step("vessel_pass", run_vessel_pass, pdf),
        ctx.step("metadata_pass", run_metadata_pass, pdf),
        ctx.step("template_pass", run_template_pass, pdf),
    )

    survey_id = await ctx.step(
        "persist_survey",
        create_survey_from_extraction,
        vessel, metadata, template,
        idempotency_key="auto",  # = f"{run_id}:persist_survey"
    )

    await ctx.step("notify", send_import_complete_email, survey_id)
    return SurveyImportResult(survey_id=survey_id)
```

`ctx.step(key, fn, *args, **kwargs)`:
- Looks up `workflow_steps.(run_id, step_key)`. If `completed`, returns the persisted output (decoded).
- Otherwise opens a new transaction (own session, separate from any caller's `transaction`), calls `fn`, persists the output, commits, returns it.
- On exception: persists `error_json`, re-raises. The SAQ task fails; on retry the workflow re-runs from the top and previously-completed steps short-circuit.
- `idempotency_key="auto"` resolves to `f"{run_id}:{step_key}"` and is passed to `fn` if it accepts one. Steps that call non-idempotent actions (`create_quote`, `send_email`) **must** thread this through to the action; the action's dedupe enforcement is the action's job.

### Triggers

```python
trigger = on_event(
    EventType.CREATED,
    model=Message,
    filter=lambda e, obj: is_survey_inbox_recipient(obj),
)
```

`on_event` is sugar that wires the workflow into `async_event_consumer` under the hood. The existing registry, SAQ dispatch, and `EventConsumerFailure` plumbing are reused. The workflow's "consumer" is a tiny adapter that creates a `workflow_runs` row and enqueues `RUN_WORKFLOW`.

### Serialization

```python
@workflow(
    trigger=...,
    serialize_on=lambda event, obj: f"thread:{obj.thread_id}" if obj.thread_id else None,
)
```

Runs sharing a `(workflow_key, serialize_key)` execute sequentially. Implementation: when picking up a run, the worker takes a Postgres advisory lock on `hash(workflow_key + serialize_key)`. Runs whose lock is held are re-enqueued with backoff. Cheap, no new infrastructure.

`None` means no serialization. Example A: `None`. Example B: `thread_id` — two emails in the same thread don't race to create duplicate customers.

## Trust + drafts

Two values in v1:

- `Trust.AUTOCOMPLETE` — workflow runs to completion, result is final. Example A.
- `Trust.DRAFT` — workflow runs to completion, but the consumer-domain actions it calls produce *draft* records (existing draft state on those models, not a platform concept). Workflow ends in `completed`, not `awaiting_review`. The draft review UI is owned by the domain (Quote's existing draft view, etc.). Example B.

`awaiting_review` state on `workflow_runs` is reserved for a future `Trust.REVIEW_ONLY` mode (workflow pauses, user explicitly resumes). **Not in v1.** No code, no UI, no state-machine transitions to it. The reserved enum value is the only forward-compat hook.

The platform deliberately does **not** ship a generic schema-driven review form. Domain teams render drafts in their own UI; the workflow just produces the draft record.

## Pre-filter gate (sync consumer)

Workflows are not the only consumer of an event. For example B, every inbound email would otherwise hit the LLM classifier — a real bill. The pattern:

```python
@event_consumer(EventType.CREATED, model=Message)
async def maybe_enrich_inbound_email(session, event, message):
    if not is_likely_crm_signal(message):  # cheap heuristics, no LLM
        return
    await trigger_workflow("enrich_inbound_email_workflow", event=event, obj=message)
```

`trigger_workflow` is a thin wrapper that creates the `workflow_runs` row and enqueues `RUN_WORKFLOW`. This split — sync consumer decides whether to start the workflow, workflow does the expensive work — keeps cost bounded without adding a "skip" primitive inside the workflow body.

For example A, the trigger filter is cheap and discriminating (exact `to_email` match), so no pre-filter is needed — the `@workflow(trigger=on_event(...))` form is enough.

## Versioning on code change

Workflow bodies re-run from the top on resume; `ctx.step()` short-circuits on completed `step_key`. In-flight runs resume under whatever workflow code is currently deployed. **The platform does not pin runs to a code version.**

The author's contract:

1. **Step keys are explicit and author-chosen.** No `auto_step_1`, no positional naming.
2. **A `step_key` is a promise that "old persisted outputs from this key are still valid."** If you change a step's body in a way that keeps its output shape and downstream semantics intact, keep the key — replays of in-flight runs will reuse the old output. Fine.
3. **When you change a step's output shape or its downstream meaning, rename the key.** The new key has no persisted row, so the step re-runs on resume. Any downstream steps that hadn't completed yet pick up the new output. This is our equivalent of Temporal's `workflow.patched()` — an explicit author-managed fork point.

What this *doesn't* protect against: a step whose downstream consumer changed shape expectations while the step's key (and persisted output) stayed the same. That's an author error and the platform can't detect it — same risk profile as Temporal's deterministic-replay model, where the author owns `patched()` discipline.

The alternative — refusing to resume runs across code changes via a pinned `code_version` — was considered and rejected. It doesn't catch the real hazard (semantic drift under an unchanged key), it just turns it into a different failure (every in-flight run fails after every deploy), and it's strictly more annoying in dev. Trust the author, give them an explicit knob, move on.

## Idempotency rules (call-site, not platform)

The platform passes `idempotency_key` into steps; the **action** the step calls is responsible for enforcing it. Concretely:

- `create_quote(..., idempotency_key=k)` does an upsert keyed by `(workspace_id, idempotency_key)` on a column we add to `quotes`. Second call with same key returns the existing row.
- `send_email(..., idempotency_key=k)` checks a dedupe table before SES.
- Naturally-idempotent actions (`get_or_create_customer(email=...)`) ignore the key.

This is real work in domain code. It is not optional for any workflow with non-idempotent side effects. The spec is honest about that cost rather than pretending the platform solves it.

## Visibility

Admin-only:
- `GET /workflows/runs?workflow_key=...&state=...` — list with cursor pagination.
- `GET /workflows/runs/:id` — run + ordered steps + inputs/outputs/errors. JSON; UI later.
- `POST /workflows/runs/:id/retry` — re-enqueue, keeping completed steps.
- `POST /workflows/runs/:id/steps/:key/retry` — wipe one step's row, re-enqueue. Used when a step succeeded with bad data and needs to re-run with downstream invalidation handled manually.

No user-facing UI in v1. The "user" of workflow visibility is the engineer iterating on prompts.

## File layout

```
backend/app/platform/workflows/
  __init__.py
  models.py            # WorkflowRun, WorkflowStep + state enums
  context.py           # WorkflowContext, ctx.step()
  decorator.py         # @workflow, on_event, trigger_workflow
  registry.py          # WorkflowRegistry (workflow_key → callable)
  service.py           # create_run, resume_run, mark_completed, mark_failed
  tasks.py             # RUN_WORKFLOW SAQ task
  routes.py            # admin read + retry
  schemas.py
backend/app/domain/surveys/
  import_workflow.py   # import_survey_workflow + its step functions
backend/app/domain/crm/
  enrich_workflow.py   # enrich_inbound_email_workflow + classifier + intent branches
```

## Open questions

1. **Advisory-lock granularity.** Per `(workflow_key, serialize_key)` hash is fine, but advisory lock keys are int64 — collisions are theoretically possible. Probably acceptable; flag if we see weirdness.
2. **`trigger_workflow` from non-event sites.** Example B's pre-filter wraps it. Do we expose it for manual admin triggers too? Probably yes; cheap to add.
3. **Result schema typing.** `result_json` is typed by the workflow's return annotation, but we don't validate on store. Worth adding msgspec decode on store + decode on read? Defer until the first time a stale `result_json` shape causes a bug.

## Roll-out

1. Land `platform/workflows/` skeleton with tables, decorator, context, SAQ task, admin GET route. No domain consumers yet.
2. Port `import_survey_workflow` (example A). This validates the linear/parallel/autocomplete path.
3. Dogfood ~10 historic surveys. Iterate via per-step retry, not by re-running from scratch.
4. Build `enrich_inbound_email_workflow` (example B). This forces draft handling, serialize_on, pre-filter pattern, and step-level idempotency to be real.
5. After both run in prod for ~4 weeks, revisit the joints. *Do not* refactor sooner; specifically, do not add a third workflow before B is stable, and do not add `Trust.REVIEW_ONLY` until a real consumer needs it.

## What this spec is honest about

- The workflow engine is a small, opinionated tool, not a Temporal. It does **not** offer: deterministic replay, signals, child workflows, timers, cancellation, history pruning, search attributes. If you need any of those, use Temporal.
- "User-configurable workflows" are not a v1 (or v2) goal. Engineers author workflows in Python. The events platform's data-driven subscription model (filters as callables) is as configurable as it gets.
- Step-level idempotency is real work in domain code. The platform passes a key; it does not magic away the action-level dedupe column or upsert path.
- We do not pin runs to code versions. In-flight runs resume under whatever's deployed. Authors manage semantic-change forks by renaming step keys — the platform can't detect semantic drift for you, same as Temporal's `patched()` model.
