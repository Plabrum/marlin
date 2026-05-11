"""Comms async tasks."""

import email as email_lib
import logging
from datetime import UTC, datetime
from email.message import Message
from email.utils import parseaddr, parsedate_to_datetime

from jinja2 import Environment, FileSystemLoader, select_autoescape
from saq.queue import Queue
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import config
from app.domain.users.models import User
from app.platform.clients.s3 import BaseS3Client
from app.platform.comms.clients.email import BaseEmailClient, EmailPayload, EmailSendError
from app.platform.comms.constants import RESERVED_INBOX_LOCAL_PARTS, normalize_local_part
from app.platform.comms.enums import EmailMessageStatus
from app.platform.comms.models.emails import EmailMessage
from app.platform.comms.models.inbound_emails import InboundEmail
from app.platform.queue.registry import TaskName, task
from app.platform.queue.transactions import with_transaction
from app.platform.queue.types import AppContext

logger = logging.getLogger(__name__)


def _parse_auth_verdicts(msg: Message) -> tuple[bool, bool, bool]:
    """Extract (spf_pass, dkim_pass, is_automated) from an inbound MIME message.

    SES inserts an Authentication-Results header with `spf=pass`/`dkim=pass`
    tokens. is_automated catches bounce/auto-reply traffic that we must never
    answer with a bounce of our own (RFC 3834, backscatter prevention).
    """
    auth_header = (msg.get("Authentication-Results") or "").lower()
    spf_pass = "spf=pass" in auth_header
    dkim_pass = "dkim=pass" in auth_header

    from_header = (msg.get("From") or "").lower()
    is_automated = (
        not from_header
        or "mailer-daemon" in from_header
        or "<>" in from_header
        or msg.get("Auto-Submitted") is not None
    )
    return spf_pass, dkim_pass, is_automated


@task(TaskName.SEND_EMAIL)
@with_transaction
async def send_email_task(
    ctx: AppContext,
    *,
    transaction: AsyncSession,
    email_client: BaseEmailClient,
    email_message_id: int,
) -> None:
    """Send a queued email and update its status.

    On success: SENT + ses_message_id + sent_at.
    On failure: raises EmailSendError (CommittableTaskError) — the FAILED status
    is committed before the exception propagates so SAQ can retry.
    """
    record = await transaction.get(EmailMessage, email_message_id)
    if record is None:
        raise ValueError(f"EmailMessage {email_message_id} not found")

    payload = EmailPayload(
        to=record.to_email,
        subject=record.subject,
        body_html=record.body_html,
        body_text=record.body_text,
        from_email=record.from_email,
        from_name=record.from_name,
        reply_to=record.reply_to_email,
        in_reply_to=record.in_reply_to_message_id,
        references=record.in_reply_to_message_id,
        message_id=record.message_id,
    )

    try:
        ses_message_id = await email_client.send_email(payload)
        record.ses_message_id = ses_message_id
        record.status = EmailMessageStatus.SENT
        record.sent_at = datetime.now(UTC)
    except Exception as e:
        record.status = EmailMessageStatus.FAILED
        record.error_message = str(e)
        raise EmailSendError(str(e)) from e


@task(TaskName.PROCESS_INBOUND_EMAIL)
@with_transaction
async def process_inbound_email_task(
    ctx: AppContext,
    *,
    transaction: AsyncSession,
    s3_client: BaseS3Client,
    queue: Queue,
    bucket: str,
    s3_key: str,
) -> dict:
    """Parse an inbound email from S3, persist a record, upload attachments, route.

    Idempotent: duplicate s3_key is silently ignored via ON CONFLICT DO NOTHING.
    """
    email_bytes = await s3_client.get_bytes(bucket, s3_key)

    msg = email_lib.message_from_bytes(email_bytes)
    from_email = parseaddr(msg.get("From", ""))[1] or None
    to_email = parseaddr(msg.get("To", ""))[1] or None
    subject = msg.get("Subject") or None
    ses_message_id = msg.get("Message-ID") or None
    in_reply_to = msg.get("In-Reply-To") or None
    raw_date = msg.get("Date")
    try:
        received_at = parsedate_to_datetime(raw_date) if raw_date else None
    except Exception:
        received_at = None

    spf_pass, dkim_pass, is_automated = _parse_auth_verdicts(msg)

    attachments_meta: list[dict] = []
    body_text: str | None = None
    body_html: str | None = None
    for part in msg.walk():
        if part.get_content_maintype() == "multipart":
            continue
        content_disposition = part.get("Content-Disposition") or ""
        ct = part.get_content_type()
        payload = part.get_payload(decode=True)

        if "attachment" in content_disposition:
            filename = part.get_filename()
            if filename:
                attachments_meta.append(
                    {
                        "filename": filename,
                        "content_type": ct,
                        "size": len(payload or b""),
                        "s3_key": None,
                    }
                )
        else:
            if isinstance(payload, bytes):
                charset = part.get_content_charset() or "utf-8"
                if ct == "text/plain" and body_text is None:
                    body_text = payload.decode(charset, errors="replace")
                elif ct == "text/html" and body_html is None:
                    body_html = payload.decode(charset, errors="replace")

    stmt = (
        insert(InboundEmail)
        .values(
            s3_bucket=bucket,
            s3_key=s3_key,
            ses_message_id=ses_message_id,
            from_email=from_email,
            to_email=to_email,
            subject=subject,
            received_at=received_at,
            in_reply_to=in_reply_to,
            spf_pass=spf_pass,
            dkim_pass=dkim_pass,
            is_automated=is_automated,
        )
        .on_conflict_do_nothing(index_elements=["s3_key"])
        .returning(InboundEmail)
    )
    result = await transaction.execute(stmt)
    record = result.scalar_one_or_none()
    if record is None:
        return {"status": "duplicate", "s3_key": s3_key}

    upload_base = f"emails/attachments/{record.id}"
    for i, (part, meta) in enumerate(
        zip(
            [
                p
                for p in msg.walk()
                if p.get_content_maintype() != "multipart"
                and "attachment" in (p.get("Content-Disposition") or "")
                and p.get_filename()
            ],
            attachments_meta,
        )
    ):
        attachment_data: bytes = part.get_payload(decode=True) or b""  # type: ignore[assignment]
        att_key = f"{upload_base}/{i}_{meta['filename']}"
        await s3_client.put_bytes(bucket, att_key, attachment_data, meta["content_type"])
        meta["s3_key"] = att_key

    record.body_text = body_text
    record.body_html = body_html
    record.attachments_json = {"attachments": attachments_meta}
    record.processed_at = datetime.now(UTC)

    to = (record.to_email or "").lower()
    local_part = normalize_local_part(to.split("@", 1)[0]) if "@" in to else ""

    # Reserved local-parts route to dedicated handlers
    if local_part == "surveys":
        await queue.enqueue(str(TaskName.HANDLE_SURVEYS_EMAIL), inbound_email_id=record.id)
        return {"status": "processed", "id": record.id, "routed": "reserved_surveys"}
    if local_part == "support":
        await queue.enqueue(str(TaskName.HANDLE_SUPPORT_EMAIL), inbound_email_id=record.id)
        return {"status": "processed", "id": record.id, "routed": "reserved_support"}
    if local_part in RESERVED_INBOX_LOCAL_PARTS:
        # Reserved but no handler yet (e.g. admin@, billing@) — silently drop.
        return {"status": "processed", "id": record.id, "routed": "reserved_dropped"}

    # User inbox lookup
    target_user_id = await transaction.scalar(select(User.id).where(User.inbox_local_part == local_part))
    if target_user_id is not None:
        record.target_user_id = target_user_id
        await queue.enqueue(str(TaskName.HANDLE_USER_INBOX_EMAIL), inbound_email_id=record.id)
        return {"status": "processed", "id": record.id, "routed": "user"}

    # Unknown recipient — bounce only if SPF+DKIM passed and message isn't
    # automated (RFC 3834: don't bounce auto-replies/bounces).
    if spf_pass and dkim_pass and not is_automated:
        await queue.enqueue(str(TaskName.SEND_UNKNOWN_RECIPIENT_BOUNCE), inbound_email_id=record.id)
        return {"status": "processed", "id": record.id, "routed": "bounced"}

    return {"status": "processed", "id": record.id, "routed": "dropped"}


@task(TaskName.HANDLE_SUPPORT_EMAIL)
@with_transaction
async def handle_support_email_task(
    ctx: AppContext,
    *,
    transaction: AsyncSession,
    inbound_email_id: int,
) -> dict:
    """Support email received — no automated action (human triage)."""
    logger.info("Support email received (id=%s) — no automated action", inbound_email_id)
    return {"status": "noop", "id": inbound_email_id}


@task(TaskName.HANDLE_SURVEYS_EMAIL)
@with_transaction
async def handle_surveys_email_task(
    ctx: AppContext,
    *,
    transaction: AsyncSession,
    inbound_email_id: int,
) -> dict:
    """Surveys email received — TODO: route to surveyor / survey-context resolver."""
    # TODO(SLQ): resolve sender → surveyor/customer, attach to a survey thread,
    # and trigger any auto-acknowledgement once that domain lands.
    logger.info("Surveys email received (id=%s) — handler stub, no-op", inbound_email_id)
    return {"status": "noop", "id": inbound_email_id}


@task(TaskName.HANDLE_USER_INBOX_EMAIL)
@with_transaction
async def handle_user_inbox_email_task(
    ctx: AppContext,
    *,
    transaction: AsyncSession,
    inbound_email_id: int,
) -> dict:
    """Per-user inbox email received — TODO: hydrate UI threads + LLM context."""
    logger.info("User inbox email received (id=%s) — handler stub, no-op", inbound_email_id)
    return {"status": "noop", "id": inbound_email_id}


@task(TaskName.SEND_UNKNOWN_RECIPIENT_BOUNCE)
@with_transaction
async def send_unknown_recipient_bounce_task(
    ctx: AppContext,
    *,
    transaction: AsyncSession,
    queue: Queue,
    inbound_email_id: int,
) -> dict:
    """Send an RFC-style mailer-daemon bounce for a delivered-but-unrouteable inbound.

    Persists an EmailMessage row and enqueues SEND_EMAIL — same path as
    user-facing sends, so retries and tracking work uniformly.
    """
    inbound = await transaction.get(InboundEmail, inbound_email_id)
    if inbound is None or not inbound.from_email:
        return {"status": "skipped", "reason": "missing_from"}

    # Defense-in-depth: caller already filters automated traffic, but a queue
    # replay could re-bounce; check again so we never backscatter.
    if inbound.is_automated:
        return {"status": "skipped", "reason": "automated"}

    domain = config.SES_FROM_EMAIL.rsplit("@", 1)[-1]
    bounce_from = f"mailer-daemon@{domain}"

    html_body, text_body = _render_bounce_template(
        original_to=inbound.to_email or "",
        original_subject=inbound.subject or "",
    )

    message = EmailMessage(
        to_email=[inbound.from_email],
        from_email=bounce_from,
        from_name="Mail Delivery System",
        reply_to_email=None,
        subject=f"Delivery failure: {inbound.to_email}",
        body_html=html_body,
        body_text=text_body,
        template_name="unknown_recipient_bounce",
        status=EmailMessageStatus.PENDING,
    )
    transaction.add(message)
    await transaction.flush()

    await queue.enqueue(str(TaskName.SEND_EMAIL), email_message_id=message.id)
    return {"status": "queued", "email_message_id": message.id}


def _render_bounce_template(*, original_to: str, original_subject: str) -> tuple[str, str]:
    env = Environment(
        loader=FileSystemLoader(config.EMAIL_TEMPLATES_DIR),
        autoescape=select_autoescape(["html", "jinja2"]),
    )
    ctx = {"original_to": original_to, "original_subject": original_subject}
    html = env.get_template("unknown_recipient_bounce/html.jinja2").render(**ctx)
    text = env.get_template("unknown_recipient_bounce/text.jinja2").render(**ctx)
    return html, text
