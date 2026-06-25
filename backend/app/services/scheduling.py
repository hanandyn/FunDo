"""Enhanced scheduling service — supports cron, every_n_days, nth_weekday, monthly."""

from datetime import date, datetime, timedelta, timezone
from collections.abc import Sequence
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from ..models.task import TaskTemplate, TaskInstance
from ..core.config import settings


DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def _app_now() -> datetime:
    try:
        return datetime.now(ZoneInfo(settings.APP_TIMEZONE))
    except ZoneInfoNotFoundError:
        return datetime.now(timezone.utc)


def _local_today() -> date:
    return _app_now().date()


def _time_window_expired(template: TaskTemplate) -> bool:
    if not template.time_window_end:
        return False
    return _app_now().strftime("%H:%M") > template.time_window_end


def _add_days(d: date, n: int) -> date:
    return d + timedelta(days=n)


def is_scheduled_today(template: TaskTemplate, target_date: date | None = None) -> bool:
    """Check if a template should generate an instance on the given date."""
    today = target_date or date.today()
    schedule = template.schedule_type

    if schedule == "once":
        # One-shot tasks only appear on the day they were created
        created = template.created_at
        if created:
            created_date = created.date() if hasattr(created, 'date') else created
            return today == created_date
        return today == date.today()  # fallback: only today
    elif schedule == "daily":
        return True
    elif schedule == "weekdays":
        return today.weekday() < 5  # Mon-Fri
    elif schedule == "weekly":
        if template.schedule_days:
            return today.weekday() in template.schedule_days
        return True  # default: any day
    elif schedule == "every_n_days":
        if not template.schedule_every_n_days:
            return True
        # Check if today is n days from the template's creation date
        created = template.created_at
        if created:
            created_date = created.date() if hasattr(created, 'date') else created
            days_diff = (today - created_date).days
            return days_diff % template.schedule_every_n_days == 0
        return True
    elif schedule == "nth_weekday":
        if template.schedule_nth_weekday:
            n = template.schedule_nth_weekday.get("n", 1)
            weekday = template.schedule_nth_weekday.get("weekday", 0)
            # weekday in JSON is 0=Monday, 1=Tuesday
            if today.weekday() != weekday:
                return False
            # Check if it's the nth occurrence of this weekday in the month
            first_of_month = today.replace(day=1)
            first_weekday = first_of_month.weekday()
            days_to_first = (weekday - first_weekday) % 7
            first_occurrence = first_of_month + timedelta(days=days_to_first)
            occurrence_num = ((today - first_occurrence).days // 7) + 1
            return occurrence_num == n
        return True
    elif schedule == "monthly":
        if template.schedule_monthly_day:
            return today.day == template.schedule_monthly_day
        return True
    elif schedule == "custom_cron":
        # Simplified cron: day_of_week * * * *
        if template.schedule_cron:
            try:
                parts = template.schedule_cron.strip().split()
                if len(parts) >= 5:
                    dow = parts[4]
                    if dow != "*":
                        dow_map = {"0": 6, "1": 0, "2": 1, "3": 2, "4": 3, "5": 4, "6": 5}
                        allowed = [int(x) for x in dow.split(",")]
                        mapped = [dow_map.get(str(x), x) for x in allowed]
                        return today.weekday() in mapped
                    dom = parts[2]
                    if dom != "*":
                        return today.day == int(dom)
                    return True
            except (ValueError, IndexError):
                pass
        return True
    elif schedule == "custom":
        if template.schedule_days:
            return today.weekday() in template.schedule_days
        return True

    # Unknown schedule types: treat as once (don't auto-repeat)
    return False


def get_next_occurrences(template: TaskTemplate, from_date: date, days: int = 7) -> list[date]:
    """Get the next `days` occurrences of this template starting from `from_date`."""
    occurrences = []
    current = from_date
    # Look ahead up to `days * 3` to find `days` occurrences (some may not match)
    max_look = days * 4
    for i in range(max_look):
        check_date = _add_days(from_date, i)
        if is_scheduled_today(template, check_date):
            occurrences.append(check_date)
            if len(occurrences) >= days:
                break
    return occurrences


async def generate_today_instances(
    db: AsyncSession,
    family_id: int,
    children_ids: Sequence[int],
) -> list[TaskInstance]:
    """Generate TaskInstance records for today only.
    
    Called when a kid loads their dashboard — ensures today's recurring
    tasks have instances. Does NOT regenerate instances that already exist
    (completed, in_progress, or pending).
    
    Also marks yesterday's pending tasks as "missed" so they don't
    carry over to the next day.
    """
    today = _local_today()
    yesterday = today - timedelta(days=1)

    # Mark yesterday's pending tasks as missed
    yesterday_start = datetime(yesterday.year, yesterday.month, yesterday.day, tzinfo=timezone.utc)
    yesterday_end = yesterday_start + timedelta(days=1)
    stale_result = await db.execute(
        select(TaskInstance).where(
            TaskInstance.status == "pending",
            TaskInstance.date >= yesterday_start,
            TaskInstance.date < yesterday_end,
            TaskInstance.child_id.in_(children_ids),
        )
    )
    stale_instances = stale_result.scalars().all()
    changed = 0
    for inst in stale_instances:
        inst.status = "missed"
        changed += 1

    today_start = datetime(today.year, today.month, today.day, tzinfo=timezone.utc)
    today_end = today_start + timedelta(days=1)
    expired_result = await db.execute(
        select(TaskInstance)
        .options(selectinload(TaskInstance.template))
        .join(TaskTemplate, TaskInstance.template_id == TaskTemplate.id)
        .where(
            TaskInstance.status.in_(["pending", "in_progress"]),
            TaskInstance.date >= today_start,
            TaskInstance.date < today_end,
            TaskInstance.child_id.in_(children_ids),
            TaskTemplate.family_id == family_id,
        )
    )
    for inst in expired_result.scalars().all():
        if inst.template and _time_window_expired(inst.template):
            inst.status = "missed"
            changed += 1

    templates_result = await db.execute(
        select(TaskTemplate).where(
            TaskTemplate.family_id == family_id,
            TaskTemplate.is_active == True,
        )
    )
    templates = templates_result.scalars().all()

    instances = []
    for template in templates:
        # Skip "once" tasks — they only get an instance on creation day
        if template.schedule_type == "once":
            continue

        if not is_scheduled_today(template, today):
            continue

        # Determine which kids get this template
        if template.assigned_kids is not None:
            eligible_kids = [cid for cid in children_ids if cid in template.assigned_kids]
        else:
            eligible_kids = list(children_ids)

        for child_id in eligible_kids:
            # Check if ANY instance already exists for today (any status)
            existing_result = await db.execute(
                select(TaskInstance).where(
                    TaskInstance.template_id == template.id,
                    TaskInstance.child_id == child_id,
                    TaskInstance.date >= today.isoformat(),
                    TaskInstance.date < _add_days(today, 1).isoformat(),
                )
            )
            existing = existing_result.scalars().first()
            if existing:
                continue

            instance = TaskInstance(
                template_id=template.id,
                child_id=child_id,
                date=datetime(today.year, today.month, today.day, tzinfo=timezone.utc),
                status="pending",
            )
            db.add(instance)
            instances.append(instance)

    if instances or changed:
        await db.commit()

    return instances


async def generate_instances_for_week(
    db: AsyncSession,
    family_id: int,
    children_ids: Sequence[int],
    start_date: date | None = None,
) -> list[TaskInstance]:
    """Generate TaskInstance records for the next 7 days for all children in family."""
    today = start_date or date.today()
    end_date = today + timedelta(days=7)

    templates_result = await db.execute(
        select(TaskTemplate).where(
            TaskTemplate.family_id == family_id,
            TaskTemplate.is_active == True,
        )
    )
    templates = templates_result.scalars().all()

    instances = []
    for template in templates:
        # Determine which kids get this template
        if template.assigned_kids is not None:
            eligible_kids = [cid for cid in children_ids if cid in template.assigned_kids]
        else:
            eligible_kids = list(children_ids)

        for i in range(8):  # check today + 7 days
            check_date = _add_days(today, i)
            if check_date > end_date:
                break
            if is_scheduled_today(template, check_date):
                for child_id in eligible_kids:
                    # Check if instance already exists
                    existing_result = await db.execute(
                        select(TaskInstance).where(
                            TaskInstance.template_id == template.id,
                            TaskInstance.child_id == child_id,
                            # Compare date part
                            TaskInstance.date >= check_date.isoformat(),
                            TaskInstance.date < _add_days(check_date, 1).isoformat(),
                        )
                    )
                    existing = existing_result.scalars().first()
                    if existing:
                        continue

                    instance = TaskInstance(
                        template_id=template.id,
                        child_id=child_id,
                        date=datetime(check_date.year, check_date.month, check_date.day, tzinfo=timezone.utc),
                        status="pending",
                    )
                    db.add(instance)
                    instances.append(instance)

    if instances:
        await db.commit()

    return instances


def get_schedule_preview(template: TaskTemplate) -> list[dict[str, object]]:
    """Return a preview of the next 7 days showing which days tasks will be generated."""
    today = date.today()
    preview = []
    day_names_short = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    for i in range(7):
        d = _add_days(today, i)
        scheduled = is_scheduled_today(template, d)
        preview.append({
            "date": d.isoformat(),
            "day": day_names_short[d.weekday()],
            "scheduled": scheduled,
        })
    return preview
