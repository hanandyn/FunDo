"""Chore Load Balancing — analyzes task distribution among siblings and suggests rebalancing."""

from datetime import date, timedelta
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.user import User
from ..models.task import TaskInstance, TaskTemplate


async def analyze_chore_load(db: AsyncSession, family_id: int) -> dict:
    """Analyze task distribution among siblings over the last 4 weeks."""
    four_weeks_ago = date.today() - timedelta(days=28)

    children_result = await db.execute(
        select(User).where(and_(User.family_id == family_id, User.role == "child"))
    )
    children = children_result.scalars().all()

    if not children:
        return {"children": [], "message": "No children in family"}

    child_stats = []
    total_tasks = 0

    for child in children:
        # Count tasks assigned in last 4 weeks
        result = await db.execute(
            select(func.count(TaskInstance.id)).where(
                and_(
                    TaskInstance.child_id == child.id,
                    func.date(TaskInstance.date) >= four_weeks_ago,
                )
            )
        )
        task_count = result.scalar() or 0
        total_tasks += task_count

        # Count completed
        completed_result = await db.execute(
            select(func.count(TaskInstance.id)).where(
                and_(
                    TaskInstance.child_id == child.id,
                    TaskInstance.status == "completed",
                    func.date(TaskInstance.date) >= four_weeks_ago,
                )
            )
        )
        completed_count = completed_result.scalar() or 0

        # Weekly average
        weekly_avg = task_count / 4 if task_count > 0 else 0

        child_stats.append({
            "child_id": child.id,
            "name": child.display_name,
            "age_tier": child.age_tier,
            "total_tasks_4wk": task_count,
            "completed_4wk": completed_count,
            "weekly_avg": round(weekly_avg, 1),
            "completion_rate": round(completed_count / task_count * 100, 0) if task_count > 0 else 0,
            "current_stars": child.stars or 0,
        })

    # Calculate percentages
    for stat in child_stats:
        stat["share_pct"] = round(stat["total_tasks_4wk"] / total_tasks * 100, 0) if total_tasks > 0 else 0

    # Sort by load descending
    child_stats.sort(key=lambda x: x["total_tasks_4wk"], reverse=True)

    # Generate suggestions
    suggestions = _generate_balance_suggestions(child_stats, total_tasks)

    return {
        "children": child_stats,
        "total_tasks_4wk": total_tasks,
        "weekly_family_avg": round(total_tasks / 4, 1),
        "suggestions": suggestions,
        "is_balanced": len(suggestions) == 0,
    }


def _generate_balance_suggestions(stats: list[dict], total: int) -> list[dict]:
    """Generate rebalancing suggestions based on task distribution."""
    suggestions = []

    if len(stats) < 2 or total == 0:
        return suggestions

    # Check for imbalances
    max_share = max(s["share_pct"] for s in stats)
    min_share = min(s["share_pct"] for s in stats)
    gap = max_share - min_share

    if gap > 25:  # More than 25% difference
        max_child = next(s for s in stats if s["share_pct"] == max_share)
        min_child = next(s for s in stats if s["share_pct"] == min_share)

        # Age-appropriate suggestions
        if min_child["age_tier"] and min_child["age_tier"] <= 2:
            suggestions.append({
                "type": "add_tasks",
                "message": f"{min_child['name']} has only {min_child['share_pct']:.0f}% of tasks vs {max_child['name']}'s {max_share:.0f}%. "
                           f"At age tier {min_child['age_tier']}, consider adding simple tasks like 'put toys away' or 'help set table'.",
                "child_id": min_child["child_id"],
                "child_name": min_child["name"],
            })
        else:
            suggestions.append({
                "type": "rebalance",
                "message": f"{max_child['name']} carries {max_share:.0f}% of family tasks vs {min_child['name']}'s {min_share:.0f}%. "
                           f"Consider redistributing some tasks for fairness.",
                "child_id": min_child["child_id"],
                "child_name": min_child["name"],
            })

    # Check for low completion rate
    for stat in stats:
        if stat["completion_rate"] < 60 and stat["total_tasks_4wk"] > 5:
            suggestions.append({
                "type": "difficulty",
                "message": f"{stat['name']}'s completion rate is {stat['completion_rate']:.0f}%. "
                           f"Tasks may be too hard or poorly timed. Consider adjusting difficulty or schedule.",
                "child_id": stat["child_id"],
                "child_name": stat["name"],
            })

    return suggestions