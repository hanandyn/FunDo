"""In-app and browser push notification helpers."""

import json
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.config import settings
from ..models.notification import Notification
from ..models.push_subscription import PushSubscription


async def create_notification(
    db: AsyncSession,
    user_id: int,
    title: str,
    body: str,
    type_: str,
    link: str | None = None,
    dedupe_window_minutes: int | None = None,
) -> Notification | None:
    """Create a notification, optionally suppressing duplicates in a time window."""
    if dedupe_window_minutes is not None:
        since = datetime.now(timezone.utc) - timedelta(minutes=dedupe_window_minutes)
        existing = await db.execute(
            select(Notification).where(
                Notification.user_id == user_id,
                Notification.title == title,
                Notification.body == body,
                Notification.type == type_,
                Notification.created_at >= since,
            )
        )
        if existing.scalar_one_or_none():
            return None

    notification = Notification(
        user_id=user_id,
        title=title,
        body=body,
        type=type_,
        link=link,
    )
    db.add(notification)
    await db.flush()
    return notification


async def send_push_to_user(
    db: AsyncSession,
    user_id: int,
    title: str,
    body: str,
    link: str | None = None,
) -> int:
    """Send a web push notification to all subscriptions for a user."""
    if not settings.VAPID_PRIVATE_KEY or not settings.VAPID_PUBLIC_KEY:
        return 0

    try:
        from pywebpush import WebPushException, webpush
    except Exception:
        return 0

    result = await db.execute(select(PushSubscription).where(PushSubscription.user_id == user_id))
    subscriptions = result.scalars().all()
    sent = 0
    stale: list[PushSubscription] = []
    payload = json.dumps({"title": title, "body": body, "link": link or "/"})

    for sub in subscriptions:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
                },
                data=payload,
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims={"sub": f"mailto:{settings.SMTP_FROM}"},
            )
            sent += 1
        except WebPushException as exc:
            if exc.response is not None and exc.response.status_code in {404, 410}:
                stale.append(sub)
        except Exception:
            continue

    for sub in stale:
        await db.delete(sub)
    if stale:
        await db.flush()

    return sent


async def notify_user(
    db: AsyncSession,
    user_id: int,
    title: str,
    body: str,
    type_: str,
    link: str | None = None,
    dedupe_window_minutes: int | None = None,
) -> None:
    notification = await create_notification(
        db,
        user_id=user_id,
        title=title,
        body=body,
        type_=type_,
        link=link,
        dedupe_window_minutes=dedupe_window_minutes,
    )
    if notification:
        await send_push_to_user(db, user_id, title, body, link)
