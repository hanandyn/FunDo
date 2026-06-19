"""Daily Recap Service — generates evening recap for kids and parents.

Recap includes:
- Tasks completed/missed today
- Points/gems earned
- Streak status
- Highlights (fastest task, perfect categories, etc.)
- Comparison to yesterday
- Tomorrow's preview/tip
"""

from datetime import date, timedelta, datetime, timezone
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.user import User
from ..models.task import TaskInstance, TaskTemplate


async def generate_kid_daily_recap(db: AsyncSession, child_id: int, recap_date: date | None = None) -> dict:
    """Generate a kid-friendly daily recap."""
    target_date = recap_date or date.today()

    # Get all task instances for this kid on this date
    result = await db.execute(
        select(TaskInstance)
        .options(selectinload(TaskInstance.template))
        .where(
            and_(
                TaskInstance.child_id == child_id,
                func.date(TaskInstance.date) == target_date,
            )
        )
    )
    instances = result.scalars().all()

    completed = [i for i in instances if i.status == "completed"]
    missed = [i for i in instances if i.status == "missed"]
    pending = [i for i in instances if i.status == "pending"]
    in_progress = [i for i in instances if i.status == "in_progress"]

    total = len(instances)
    done = len(completed)
    total_points = sum(i.points_earned or 0 for i in completed)

    # Get yesterday's data for comparison
    yesterday = target_date - timedelta(days=1)
    yest_result = await db.execute(
        select(TaskInstance).where(
            and_(
                TaskInstance.child_id == child_id,
                func.date(TaskInstance.date) == yesterday,
            )
        )
    )
    yest_instances = yest_result.scalars().all()
    yest_points = sum(i.points_earned or 0 for i in yest_instances if i.status == "completed")
    yest_done = sum(1 for i in yest_instances if i.status == "completed")

    # Get child info
    child_result = await db.execute(select(User).where(User.id == child_id))
    child = child_result.scalar_one_or_none()

    # Find fastest timed task
    fastest = None
    for inst in completed:
        if inst.template and inst.template.task_type == "timed" and inst.timer_started_at and inst.timer_ended_at:
            elapsed = (inst.timer_ended_at - inst.timer_started_at).total_seconds()
            if not fastest or elapsed < fastest["elapsed"]:
                fastest = {
                    "name": inst.template.name,
                    "elapsed": elapsed,
                    "elapsed_display": f"{int(elapsed // 60)} min {int(elapsed % 60)} sec",
                }

    # Points comparison
    points_diff = total_points - yest_points
    points_trend = "↑" if points_diff > 0 else "↓" if points_diff < 0 else "→"
    points_pct = f"{abs(points_diff / yest_points * 100):.0f}%" if yest_points > 0 else ""

    # Highlights
    highlights = []
    if fastest:
        highlights.append(f"⚡ Fastest {fastest['name']}: {fastest['elapsed_display']}")
    if len(completed) == total and total > 0:
        highlights.append("🌟 Perfect day — all tasks done!")
    if child and (child.current_streak or 0) >= 3:
        highlights.append(f"🔥 {child.current_streak}-day streak!")

    # Tomorrow's tip
    tomorrow_tip = _get_tomorrow_tip(child, pending, missed)

    completion_rate = (done / total * 100) if total > 0 else 0

    return {
        "date": target_date.isoformat(),
        "child_name": child.display_name if child else "Kid",
        "summary": {
            "completed": done,
            "total": total,
            "missed": len(missed),
            "pending": len(pending),
            "in_progress": len(in_progress),
            "completion_rate": round(completion_rate, 0),
        },
        "points_earned": total_points,
        "gems_earned": 0,  # Could be tracked if gems are awarded daily
        "streak": child.current_streak if child else 0,
        "highlights": highlights,
        "vs_yesterday": {
            "points_diff": points_diff,
            "trend": points_trend,
            "percentage": points_pct,
        },
        "tomorrow_tip": tomorrow_tip,
        "fastest_task": fastest,
    }


async def generate_parent_daily_recap(db: AsyncSession, family_id: int, recap_date: date | None = None) -> dict:
    """Generate parent's daily family recap."""
    target_date = recap_date or date.today()

    # Get all children
    children_result = await db.execute(
        select(User).where(and_(User.family_id == family_id, User.role == "child"))
    )
    children = children_result.scalars().all()

    child_recaps = []
    total_completed = 0
    total_assigned = 0
    total_points = 0

    for child in children:
        recap = await generate_kid_daily_recap(db, child.id, target_date)
        child_recaps.append(recap)
        total_completed += recap["summary"]["completed"]
        total_assigned += recap["summary"]["total"]
        total_points += recap["points_earned"]

    family_rate = (total_completed / total_assigned * 100) if total_assigned > 0 else 0

    # Check for pending photo approvals
    pending_approvals = await db.execute(
        select(func.count(TaskInstance.id)).where(
            and_(
                TaskInstance.status == "completed",
                TaskInstance.parent_approved_at.is_(None),
            )
        )
    )
    pending_count = pending_approvals.scalar() or 0

    return {
        "date": target_date.isoformat(),
        "family_completion_rate": round(family_rate, 0),
        "total_completed": total_completed,
        "total_assigned": total_assigned,
        "total_points": total_points,
        "children": child_recaps,
        "pending_approvals": pending_count,
    }


def _get_tomorrow_tip(child: User | None, pending: list, missed: list) -> str:
    """Generate a contextual tip for tomorrow."""
    if not child:
        return "Tomorrow is a new adventure! 🌅"

    streak = child.current_streak or 0

    if missed:
        names = [i.template.name for i in missed if i.template]
        if names:
            return f"Tomorrow, let's focus on {' and '.join(names[:2])}! 💪"
        return "Tomorrow is a fresh start! 🌈"

    if pending:
        return "You have tasks waiting — finish them for bonus points! ⭐"

    if streak >= 10:
        return f"Keep your {streak}-day streak alive tomorrow! 🔥"

    if streak >= 3:
        return f"Great {streak}-day streak! Don't break the chain! 🔥"

    return "Tomorrow is a new adventure! 🌅"