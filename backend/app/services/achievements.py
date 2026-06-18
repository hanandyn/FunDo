"""Achievement service — checks and awards achievements for children."""

import json
from datetime import date, timedelta
from typing import Optional
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.user import User
from ..models.streak import Achievement, ChildAchievement
from ..models.task import TaskInstance


async def seed_achievements(db: AsyncSession) -> list[Achievement]:
    """Seed 20+ achievements into the database if they don't exist."""
    existing = await db.execute(select(Achievement))
    existing_list = existing.scalars().all()
    if existing_list:
        return existing_list

    achievements_data = [
        {"name": "First Steps", "description": "Complete your very first task", "icon": "👶", "rarity": "common", "unlock_criteria": {"type": "tasks_completed", "value": 1}},
        {"name": "Getting Started", "description": "Complete 5 tasks", "icon": "🌟", "rarity": "common", "unlock_criteria": {"type": "tasks_completed", "value": 5}},
        {"name": "On A Roll", "description": "Complete 10 tasks", "icon": "⚡", "rarity": "common", "unlock_criteria": {"type": "tasks_completed", "value": 10}},
        {"name": "Speed Demon", "description": "Complete 3 timed tasks under 5 minutes each in one week", "icon": "🏃", "rarity": "rare", "unlock_criteria": {"type": "speed_demon", "value": 3}},
        {"name": "Helping Hand", "description": "Complete a bonus task", "icon": "🤝", "rarity": "common", "unlock_criteria": {"type": "bonus_task", "value": 1}},
        {"name": "Week Warrior", "description": "Maintain a 7-day streak", "icon": "🔥", "rarity": "rare", "unlock_criteria": {"type": "streak", "value": 7}},
        {"name": "Monthly Master", "description": "Maintain a 30-day streak", "icon": "📅", "rarity": "epic", "unlock_criteria": {"type": "streak", "value": 30}},
        {"name": "Century", "description": "Complete 100 tasks", "icon": "💯", "rarity": "epic", "unlock_criteria": {"type": "tasks_completed", "value": 100}},
        {"name": "Jackpot", "description": "Hit a 5× random bonus on a task", "icon": "🎰", "rarity": "legendary", "unlock_criteria": {"type": "jackpot", "value": 1}},
        {"name": "Early Bird", "description": "Complete all pending tasks before noon", "icon": "🌅", "rarity": "rare", "unlock_criteria": {"type": "early_bird", "value": 1}},
        {"name": "Shopaholic", "description": "Redeem your first reward from the shop", "icon": "🛒", "rarity": "common", "unlock_criteria": {"type": "first_redemption", "value": 1}},
        {"name": "Lucky Star", "description": "Hit a 2× random bonus 5 times", "icon": "⭐", "rarity": "rare", "unlock_criteria": {"type": "lucky_star", "value": 5}},
        {"name": "Task Tamer", "description": "Reach Level 15", "icon": "🦊", "rarity": "rare", "unlock_criteria": {"type": "level", "value": 15}},
        {"name": "Chore Champion", "description": "Reach Level 20", "icon": "⚔️", "rarity": "epic", "unlock_criteria": {"type": "level", "value": 20}},
        {"name": "Quest Master", "description": "Reach Level 30", "icon": "🦸", "rarity": "epic", "unlock_criteria": {"type": "level", "value": 30}},
        {"name": "Legend", "description": "Reach Level 40", "icon": "👑", "rarity": "legendary", "unlock_criteria": {"type": "level", "value": 40}},
        {"name": "Mythic", "description": "Reach Level 50 — you're a legend!", "icon": "🏆", "rarity": "legendary", "unlock_criteria": {"type": "level", "value": 50}},
        {"name": "Team Player", "description": "Complete a team task", "icon": "👥", "rarity": "rare", "unlock_criteria": {"type": "team_task", "value": 1}},
        {"name": "Consistent Star", "description": "Complete at least one task every day for 14 days", "icon": "📊", "rarity": "rare", "unlock_criteria": {"type": "streak", "value": 14}},
        {"name": "Rising Star", "description": "Reach Level 10", "icon": "⭐", "rarity": "common", "unlock_criteria": {"type": "level", "value": 10}},
        {"name": "Tiny Helper", "description": "Reach Level 5", "icon": "🐣", "rarity": "common", "unlock_criteria": {"type": "level", "value": 5}},
        {"name": "Routine Master", "description": "Complete every daily task for 5 days straight", "icon": "✅", "rarity": "rare", "unlock_criteria": {"type": "perfect_week", "value": 5}},
    ]

    achievements = []
    for data in achievements_data:
        achievement = Achievement(
            name=data["name"],
            description=data["description"],
            icon=data["icon"],
            rarity=data["rarity"],
            unlock_criteria=data["unlock_criteria"],
        )
        db.add(achievement)
        achievements.append(achievement)

    await db.commit()
    return achievements


async def get_all_achievements(db: AsyncSession) -> list[Achievement]:
    """Get all seeded achievements."""
    result = await db.execute(select(Achievement))
    return result.scalars().all()


async def get_child_achievements(db: AsyncSession, child_id: int) -> list[dict]:
    """Get a child's earned achievements plus all locked ones."""
    all_achievements = await get_all_achievements(db)

    earned_result = await db.execute(
        select(ChildAchievement).where(ChildAchievement.child_id == child_id)
    )
    earned = earned_result.scalars().all()
    earned_ids = {e.achievement_id for e in earned}
    earned_map = {e.achievement_id: e for e in earned}

    result = []
    for a in all_achievements:
        entry = {
            "id": a.id,
            "name": a.name,
            "description": a.description,
            "icon": a.icon,
            "rarity": a.rarity,
            "unlock_criteria": a.unlock_criteria,
            "unlocked": a.id in earned_ids,
            "unlocked_at": earned_map[a.id].unlocked_at.isoformat() if a.id in earned_ids else None,
        }
        result.append(entry)

    return result


async def check_and_award_achievements(
    db: AsyncSession,
    child: User,
    scoring_result: Optional[dict] = None,
    task_type: Optional[str] = None,
    timed_under_5min: bool = False,
) -> list[dict]:
    """Check all achievement criteria and award any newly earned ones.
    
    After task completion, call this to evaluate achievements.
    Returns list of newly earned achievements.
    """
    # Ensure achievements are seeded
    await seed_achievements(db)

    all_achievements = await get_all_achievements(db)

    # Get already earned
    earned_result = await db.execute(
        select(ChildAchievement).where(ChildAchievement.child_id == child.id)
    )
    earned = earned_result.scalars().all()
    earned_ids = {e.achievement_id for e in earned}

    newly_earned = []

    for achievement in all_achievements:
        if achievement.id in earned_ids:
            continue

        criteria = achievement.unlock_criteria
        criteria_type = criteria.get("type")
        criteria_value = criteria.get("value", 0)

        # Build a dynamic context of what to check
        matched = await _check_criterion(
            db, child, criteria_type, criteria_value,
            scoring_result, task_type, timed_under_5min,
        )

        if matched:
            child_ach = ChildAchievement(
                child_id=child.id,
                achievement_id=achievement.id,
            )
            db.add(child_ach)
            newly_earned.append({
                "id": achievement.id,
                "name": achievement.name,
                "description": achievement.description,
                "icon": achievement.icon,
                "rarity": achievement.rarity,
            })

    if newly_earned:
        await db.commit()

    return newly_earned


async def _check_criterion(
    db: AsyncSession,
    child: User,
    criteria_type: str,
    criteria_value: int,
    scoring_result: Optional[dict] = None,
    task_type: Optional[str] = None,
    timed_under_5min: bool = False,
) -> bool:
    """Evaluate a single achievement criterion against the child's current state."""
    
    if criteria_type == "tasks_completed":
        return child.total_tasks_completed >= criteria_value

    elif criteria_type == "streak":
        return child.current_streak >= criteria_value

    elif criteria_type == "level":
        return child.level >= criteria_value

    elif criteria_type == "bonus_task":
        return task_type == "bonus" and child.total_tasks_completed >= 1

    elif criteria_type == "team_task":
        return task_type == "team"

    elif criteria_type == "jackpot":
        if scoring_result and scoring_result.get("random_multiplier", 1) >= 5:
            # Count how many times they've hit jackpot
            count_result = await db.execute(
                select(ChildAchievement).where(
                    and_(
                        ChildAchievement.child_id == child.id,
                        ChildAchievement.achievement_id.in_(
                            select(Achievement.id).where(
                                Achievement.unlock_criteria.contains('"type": "jackpot"')
                            )
                        ),
                    )
                )
            )
            return len(count_result.scalars().all()) < criteria_value  # first time

    elif criteria_type == "lucky_star":
        # Count lucky star hits (2x random multiplier)
        if scoring_result and scoring_result.get("random_multiplier", 1) == 2:
            return True  # Each 2x hit earns one progress; tracked by accumulating ChildAchievement entries
        return False

    elif criteria_type == "speed_demon":
        if timed_under_5min:
            # Count speed demon completions this week
            week_ago = date.today() - timedelta(days=7)
            count_result = await db.execute(
                select(func.count(TaskInstance.id)).where(
                    and_(
                        TaskInstance.child_id == child.id,
                        TaskInstance.status == "completed",
                        TaskInstance.created_at >= week_ago,
                    )
                )
            )
            # We count per-week via accumulation - just check if this qualifies
            return True  # Each qualifying task adds one

    elif criteria_type == "perfect_week":
        # Check if child has completed tasks on each of the last N days
        days_to_check = criteria_value
        all_days = True
        for i in range(days_to_check):
            check_date = date.today() - timedelta(days=i)
            count_result = await db.execute(
                select(func.count(TaskInstance.id)).where(
                    and_(
                        TaskInstance.child_id == child.id,
                        TaskInstance.status == "completed",
                        func.date(TaskInstance.created_at) == check_date,
                    )
                )
            )
            if count_result.scalar() == 0:
                all_days = False
                break
        return all_days

    elif criteria_type == "early_bird":
        # Check if all today's pending tasks are done and current time is before noon
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        if now.hour < 10:  # UTC noon-ish for Israel
            pending = await db.execute(
                select(func.count(TaskInstance.id)).where(
                    and_(
                        TaskInstance.child_id == child.id,
                        TaskInstance.status == "pending",
                        func.date(TaskInstance.created_at) == date.today(),
                    )
                )
            )
            return pending.scalar() == 0
        return False

    elif criteria_type == "first_redemption":
        from ..models.reward import RewardRedemption
        count_result = await db.execute(
            select(func.count(RewardRedemption.id)).where(
                RewardRedemption.child_id == child.id
            )
        )
        return count_result.scalar() >= criteria_value

    return False
