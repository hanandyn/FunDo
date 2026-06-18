"""Streak management service."""

from datetime import date, timedelta
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.user import User
from ..models.streak import StreakHistory


FREEZE_TOKEN_EVERY_N_DAYS = 7  # Earn 1 freeze token every 7 days


async def get_today_streak_entry(db: AsyncSession, child_id: int) -> StreakHistory | None:
    today = date.today()
    result = await db.execute(
        select(StreakHistory).where(
            and_(StreakHistory.child_id == child_id, StreakHistory.date == today)
        )
    )
    return result.scalar_one_or_none()


async def update_streak_on_completion(db: AsyncSession, child: User) -> dict:
    """Update the child's streak after a task completion. Returns streak info."""
    today = date.today()
    
    # Check if there's already a streak entry for today
    entry = await get_today_streak_entry(db, child.id)
    
    if entry is None:
        # Check yesterday's streak
        yesterday = today - timedelta(days=1)
        yesterday_result = await db.execute(
            select(StreakHistory).where(
                and_(StreakHistory.child_id == child.id, StreakHistory.date == yesterday)
            )
        )
        yesterday_entry = yesterday_result.scalar_one_or_none()

        if yesterday_entry and yesterday_entry.streak_day_number > 0:
            new_day = yesterday_entry.streak_day_number + 1
        else:
            new_day = 1  # New streak starts

        # Create today's entry
        entry = StreakHistory(
            child_id=child.id,
            date=today,
            tasks_completed=1,
            tasks_total=1,
            streak_day_number=new_day,
        )
        db.add(entry)

        # Update child's streak
        child.current_streak = new_day
        if new_day > child.longest_streak:
            child.longest_streak = new_day

        # Award freeze token every N days
        if new_day > 0 and new_day % FREEZE_TOKEN_EVERY_N_DAYS == 0:
            child.freeze_tokens += 1

    else:
        # Already have an entry — increment completed count
        entry.tasks_completed += 1
        entry.tasks_total += 1

    await db.flush()
    return {
        "current_streak": child.current_streak,
        "longest_streak": child.longest_streak,
        "freeze_tokens": child.freeze_tokens,
        "streak_day_number": entry.streak_day_number,
    }


async def apply_freeze_token(db: AsyncSession, child: User) -> bool:
    """Use a freeze token to protect the streak. Returns True if applied."""
    if child.freeze_tokens <= 0:
        return False
    
    today = date.today()
    yesterday = today - timedelta(days=1)
    
    yesterday_result = await db.execute(
        select(StreakHistory).where(
            and_(StreakHistory.child_id == child.id, StreakHistory.date == yesterday)
        )
    )
    yesterday_entry = yesterday_result.scalar_one_or_none()

    if yesterday_entry and yesterday_entry.streak_day_number > 0:
        # Create today's entry as "protected"
        entry = StreakHistory(
            child_id=child.id,
            date=today,
            tasks_completed=0,
            tasks_total=0,
            streak_day_number=yesterday_entry.streak_day_number + 1,
            streak_protected=True,
        )
        db.add(entry)
        child.freeze_tokens -= 1
        child.current_streak = entry.streak_day_number
        await db.flush()
        return True
    
    return False


async def get_streak_info(db: AsyncSession, child: User) -> dict:
    """Get comprehensive streak information for a child."""
    from .scoring import calculate_streak_multiplier
    
    return {
        "current_streak": child.current_streak,
        "longest_streak": child.longest_streak,
        "freeze_tokens": child.freeze_tokens,
        "streak_multiplier": calculate_streak_multiplier(child.current_streak),
        "next_milestone": _next_streak_milestone(child.current_streak),
        "next_freeze_at": (
            FREEZE_TOKEN_EVERY_N_DAYS - (child.current_streak % FREEZE_TOKEN_EVERY_N_DAYS)
            if child.current_streak > 0 else FREEZE_TOKEN_EVERY_N_DAYS
        ),
    }


def _next_streak_milestone(current: int) -> dict | None:
    milestones = [3, 7, 14, 30, 60]
    for m in milestones:
        if current < m:
            return {"days": m, "remaining": m - current}
    return None
