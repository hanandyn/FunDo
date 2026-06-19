"""Onboarding API — guided setup for new families."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_db
from ..core.auth import get_current_user
from ..models.user import User, Family
from ..models.task import TaskTemplate

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


class OnboardingTemplateRequest(BaseModel):
    """Config for generating starter templates."""
    child_count: int = 1
    age_tiers: List[int] = []
    child_names: List[str] = []


class OnboardingCompleteRequest(BaseModel):
    """Mark onboarding as complete."""
    pass


class OnboardingTemplate(BaseModel):
    """A single starter template suggestion."""
    name: str
    description: str
    category: str
    task_type: str
    base_points: int
    timer_duration: Optional[int] = None
    age_tier_min: int
    age_tier_max: int
    icon: str

    class Config:
        from_attributes = True


class OnboardingTemplateSet(BaseModel):
    """Collection of starter templates grouped by category."""
    tasks: List[OnboardingTemplate]


# Pre-built starter templates for different age ranges
STARTER_TASKS: List[dict] = [
    # Ages 3-5 (Tier 1)
    {"name": "Put away toys", "description": "Pick up all toys and put them where they belong", "category": "chores", "task_type": "one_shot", "base_points": 10, "age_tier_min": 1, "age_tier_max": 2, "icon": "🧸"},
    {"name": "Brush teeth", "description": "Brush your teeth for 2 minutes", "category": "hygiene", "task_type": "timed", "base_points": 10, "timer_duration": 120, "age_tier_min": 1, "age_tier_max": 3, "icon": "🪥"},
    {"name": "Get dressed", "description": "Put on your clothes by yourself", "category": "self-care", "task_type": "timed", "base_points": 15, "timer_duration": 300, "age_tier_min": 1, "age_tier_max": 2, "icon": "👕"},
    {"name": "Make bed", "description": "Pull up your blanket and arrange pillows", "category": "chores", "task_type": "one_shot", "base_points": 10, "age_tier_min": 1, "age_tier_max": 4, "icon": "🛏️"},
    {"name": "Say please and thank you", "description": "Use polite words all day", "category": "manners", "task_type": "streak", "base_points": 15, "age_tier_min": 1, "age_tier_max": 3, "icon": "🙏"},
    # Ages 6-12 (Tier 2-3)
    {"name": "Do homework", "description": "Complete all homework assignments", "category": "school", "task_type": "timed", "base_points": 25, "timer_duration": 1800, "age_tier_min": 2, "age_tier_max": 4, "icon": "📚"},
    {"name": "Clean room", "description": "Vacuum floor and organize desk", "category": "chores", "task_type": "timed", "base_points": 20, "timer_duration": 900, "age_tier_min": 2, "age_tier_max": 5, "icon": "🧹"},
    {"name": "Set the table", "description": "Place plates, utensils, and cups for dinner", "category": "chores", "task_type": "one_shot", "base_points": 15, "age_tier_min": 2, "age_tier_max": 4, "icon": "🍽️"},
    {"name": "Read for 20 minutes", "description": "Read any book for at least 20 minutes", "category": "learning", "task_type": "timed", "base_points": 20, "timer_duration": 1200, "age_tier_min": 2, "age_tier_max": 5, "icon": "📖"},
    {"name": "Help with dishes", "description": "Help clean up after meals", "category": "chores", "task_type": "one_shot", "base_points": 15, "age_tier_min": 2, "age_tier_max": 5, "icon": "🫧"},
    {"name": "Practice instrument", "description": "Practice your musical instrument", "category": "learning", "task_type": "timed", "base_points": 25, "timer_duration": 1200, "age_tier_min": 3, "age_tier_max": 5, "icon": "🎹"},
    {"name": "Feed pet", "description": "Feed and water your pet", "category": "chores", "task_type": "streak", "base_points": 15, "age_tier_min": 2, "age_tier_max": 5, "icon": "🐾"},
    {"name": "Limit screen time", "description": "Keep screen time under the daily limit", "category": "self-care", "task_type": "streak", "base_points": 20, "age_tier_min": 2, "age_tier_max": 5, "icon": "📱"},
    # Ages 13-18 (Tier 5+)
    {"name": "Complete homework", "description": "Finish all homework and study for tests", "category": "school", "task_type": "timed", "base_points": 30, "timer_duration": 2700, "age_tier_min": 4, "age_tier_max": 5, "icon": "📝"},
    {"name": "Exercise", "description": "30 minutes of physical activity", "category": "health", "task_type": "timed", "base_points": 25, "timer_duration": 1800, "age_tier_min": 4, "age_tier_max": 5, "icon": "🏃"},
    {"name": "Cook dinner", "description": "Help prepare or cook the family dinner", "category": "chores", "task_type": "one_shot", "base_points": 25, "age_tier_min": 4, "age_tier_max": 5, "icon": "👨‍🍳"},
    {"name": "Laundry", "description": "Wash, dry, fold, and put away your laundry", "category": "chores", "task_type": "one_shot", "base_points": 20, "age_tier_min": 4, "age_tier_max": 5, "icon": "🧺"},
    {"name": "Budget tracking", "description": "Track your spending and update budget", "category": "life-skills", "task_type": "streak", "base_points": 20, "age_tier_min": 4, "age_tier_max": 5, "icon": "💰"},
]


STARTER_REWARDS: List[dict] = [
    {"name": "Extra screen time", "description": "30 extra minutes of screen time", "category": "privilege", "cost_stars": 50, "age_min": 1, "age_max": 5},
    {"name": "Choose dinner", "description": "Pick what's for dinner tonight!", "category": "privilege", "cost_stars": 60, "age_min": 1, "age_max": 5},
    {"name": "Movie night", "description": "Pick a movie for family movie night", "category": "fun", "cost_stars": 80, "age_min": 1, "age_max": 5},
    {"name": "Stay up late", "description": "Stay up 30 minutes past bedtime", "category": "privilege", "cost_stars": 70, "age_min": 1, "age_max": 5},
    {"name": "Small toy/treat", "description": "Pick out a small toy or treat (up to $5)", "category": "treat", "cost_stars": 100, "age_min": 1, "age_max": 3},
    {"name": "Friend sleepover", "description": "Have a friend sleep over", "category": "fun", "cost_stars": 150, "age_min": 3, "age_max": 5},
    {"name": "Outing choice", "description": "Pick the family weekend activity", "category": "fun", "cost_stars": 120, "age_min": 2, "age_max": 5},
    {"name": "Allowance bonus", "description": "Bonus allowance this week", "category": "money", "cost_stars": 100, "age_min": 4, "age_max": 5},
]


@router.get("/templates")
async def get_onboarding_templates(
    age_tiers: str = "",
    current_user: User = Depends(get_current_user),
):
    """Get age-appropriate starter task templates for onboarding."""
    tiers = [int(t) for t in age_tiers.split(",") if t.strip().isdigit()] if age_tiers else list(range(1, 6))

    matching_tasks = [
        OnboardingTemplate(**t)
        for t in STARTER_TASKS
        if t["age_tier_min"] in tiers or t["age_tier_max"] in tiers
    ]

    return {
        "tasks": matching_tasks,
        "rewards": STARTER_REWARDS,
    }


@router.post("/complete")
async def complete_onboarding(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark family onboarding as completed."""
    if current_user.role != "parent":
        return {"status": "error", "message": "Only parents can complete onboarding"}

    family = await db.get(Family, current_user.family_id)
    if not family:
        return {"status": "error", "message": "Family not found"}

    family.onboarding_completed = True
    await db.commit()

    return {"status": "ok", "message": "Onboarding marked complete"}


@router.get("/status")
async def get_onboarding_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Check if family has completed onboarding."""
    if not current_user.family_id:
        return {"completed": False, "reason": "no_family"}

    family = await db.get(Family, current_user.family_id)
    if not family:
        return {"completed": False, "reason": "no_family"}

    return {
        "completed": getattr(family, "onboarding_completed", False) or False,
    }
