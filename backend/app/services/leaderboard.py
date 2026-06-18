"""Leaderboard and statistics service."""

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.user import User
from ..models.task import TaskInstance


async def get_family_leaderboard(db: AsyncSession, family_id: int) -> list[dict]:
    """Get leaderboard for all children in a family."""
    # Get all children in the family
    result = await db.execute(
        select(User).where(
            and_(User.family_id == family_id, User.role == "child")
        )
    )
    children = result.scalars().all()

    leaderboard = []
    for child in children:
        # Calculate completion rate for this week
        stats = await get_child_weekly_stats(db, child.id)
        leaderboard.append({
            "child_id": child.id,
            "display_name": child.display_name,
            "level": child.level,
            "stars": child.stars,
            "gems": child.gems,
            "current_streak": child.current_streak,
            "completion_rate": stats["completion_rate"],
            "xp_this_week": stats["xp_this_week"],
            "age_tier": child.age_tier,
        })

    # Sort by stars descending
    leaderboard.sort(key=lambda x: x["stars"], reverse=True)
    return leaderboard


async def get_child_weekly_stats(db: AsyncSession, child_id: int) -> dict:
    """Get weekly statistics for a child."""
    from datetime import date, timedelta
    
    today = date.today()
    week_start = today - timedelta(days=today.weekday())  # Monday
    
    result = await db.execute(
        select(TaskInstance).where(
            and_(
                TaskInstance.child_id == child_id,
                func.date(TaskInstance.created_at) >= week_start,
            )
        )
    )
    instances = result.scalars().all()

    completed = [i for i in instances if i.status == "completed"]
    total = len(instances)
    completion_rate = (len(completed) / total * 100) if total > 0 else 0
    xp_this_week = sum(i.points_earned for i in completed)

    return {
        "completion_rate": round(completion_rate, 1),
        "xp_this_week": xp_this_week,
        "tasks_completed": len(completed),
        "tasks_total": total,
    }


async def get_child_all_time_stats(db: AsyncSession, child_id: int) -> dict:
    """Get all-time statistics for a child."""
    result = await db.execute(
        select(TaskInstance).where(TaskInstance.child_id == child_id)
    )
    instances = result.scalars().all()

    completed = [i for i in instances if i.status == "completed"]
    total = len(instances)
    completion_rate = (len(completed) / total * 100) if total > 0 else 0

    return {
        "total_tasks_completed": len(completed),
        "total_points_earned": sum(i.points_earned for i in completed),
        "completion_rate": round(completion_rate, 1),
    }
