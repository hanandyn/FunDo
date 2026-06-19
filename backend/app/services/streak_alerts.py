"""Streak Alerts — proactive notifications for streak-at-risk, golden opportunities, and milestones."""

from datetime import datetime, timezone, date, timedelta
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.user import User
from ..models.task import TaskInstance, TaskTemplate


async def check_streak_risk(db: AsyncSession, family_id: int) -> list[dict]:
    """Check if any kid with a streak 3+ hasn't completed tasks by their usual time.

    Uses the child's average completion time from past 2 weeks.
    If current time is 1+ hours past their usual last completion time and
    they still have pending tasks, flag the streak as at risk.
    """
    alerts = []
    now = datetime.now(timezone.utc)

    children_result = await db.execute(
        select(User).where(
            and_(User.family_id == family_id, User.role == "child", User.current_streak >= 3)
        )
    )
    children = children_result.scalars().all()

    for child in children:
        # Get completed tasks from last 2 weeks to find usual completion time
        recent_result = await db.execute(
            select(TaskInstance).where(
                and_(
                    TaskInstance.child_id == child.id,
                    TaskInstance.status == "completed",
                    TaskInstance.timer_ended_at.isnot(None),
                    TaskInstance.timer_ended_at >= datetime.now(timezone.utc) - timedelta(days=14),
                )
            )
        )
        recent = recent_result.scalars().all()

        if not recent or len(recent) < 3:
            continue

        # Find the latest usual completion time
        completion_hours = [r.timer_ended_at.hour for r in recent if r.timer_ended_at]
        if not completion_hours:
            continue

        avg_last_hour = max(completion_hours)  # Their usual "last task done by" hour

        current_hour = now.hour

        # Check if it's past their usual time
        if current_hour < avg_last_hour:
            continue

        # Check if they still have pending tasks today
        today_pending = await db.execute(
            select(func.count(TaskInstance.id)).where(
                and_(
                    TaskInstance.child_id == child.id,
                    TaskInstance.status.in_(["pending", "in_progress"]),
                    func.date(TaskInstance.date) == date.today(),
                )
            )
        )
        pending_count = today_pending.scalar() or 0

        if pending_count > 0:
            alerts.append({
                "child_id": child.id,
                "child_name": child.display_name,
                "streak": child.current_streak,
                "pending_tasks": pending_count,
                "usual_time": f"{avg_last_hour}:00",
                "message": f"⚠️ {child.display_name} hasn't finished {pending_count} task(s) — {child.current_streak}-day streak at risk!",
                "has_freeze_token": (child.freeze_tokens or 0) > 0,
            })

    return alerts


async def check_golden_opportunity(db: AsyncSession, family_id: int) -> dict:
    """Check if all kids have completed all tasks → 'Golden Opportunity' bonus."""
    children_result = await db.execute(
        select(User).where(and_(User.family_id == family_id, User.role == "child"))
    )
    children = children_result.scalars().all()

    if not children:
        return {"active": False, "reason": "no_children"}

    all_done = True
    total_pending = 0

    for child in children:
        pending_result = await db.execute(
            select(func.count(TaskInstance.id)).where(
                and_(
                    TaskInstance.child_id == child.id,
                    TaskInstance.status.in_(["pending", "in_progress"]),
                    func.date(TaskInstance.date) == date.today(),
                )
            )
        )
        pending = pending_result.scalar() or 0
        total_pending += pending
        if pending > 0:
            all_done = False

    current_hour = datetime.now(timezone.utc).hour

    return {
        "active": all_done and current_hour < 20,  # Active before 8 PM
        "total_pending": total_pending,
        "message": "🌟 Everyone's done! Bonus Hour activated — 3× points on bonus tasks!" if all_done else f"{total_pending} tasks still pending",
        "bonus_multiplier": 3.0 if all_done else 1.0,
    }


async def check_milestones(db: AsyncSession, child_id: int) -> list[dict]:
    """Check for upcoming milestones (streak, level, achievements)."""
    milestones = []

    child_result = await db.execute(select(User).where(User.id == child_id))
    child = child_result.scalar_one_or_none()
    if not child:
        return milestones

    # Streak milestones
    streak = child.current_streak or 0
    streak_milestones = [7, 14, 30, 50, 100, 365]
    for ms in streak_milestones:
        if streak < ms and streak >= ms - 3:
            days_left = ms - streak
            milestones.append({
                "type": "streak",
                "target": ms,
                "days_left": days_left,
                "message": f"🏆 {days_left} day{'s' if days_left > 1 else ''} from a {ms}-day streak! Don't break the chain! 🔥",
            })
            break  # Only show the nearest one

    # Level milestone
    level = child.level or 1
    next_level = level + 1
    milestones.append({
        "type": "level",
        "current": level,
        "next": next_level,
        "message": f"🎯 You're approaching Level {next_level}! Keep completing quests! ⭐",
    })

    # Chest milestone
    completed_since_chest = child.completed_since_last_chest or 0
    if completed_since_chest < 10:
        tasks_left = 10 - completed_since_chest
        milestones.append({
            "type": "chest",
            "tasks_left": tasks_left,
            "message": f"🎁 {tasks_left} more task{'s' if tasks_left != 1 else ''} to unlock a Mystery Chest!",
        })

    return milestones