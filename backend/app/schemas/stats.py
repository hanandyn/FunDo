"""Pydantic schemas for leaderboard and stats."""

from pydantic import BaseModel
from typing import Optional


class LeaderboardEntry(BaseModel):
    child_id: int
    display_name: str
    level: int
    stars: int
    gems: int
    current_streak: int
    completion_rate: float  # 0-100
    xp_this_week: int
    age_tier: Optional[int] = None


class ChildStats(BaseModel):
    total_tasks_completed: int
    total_points_earned: int
    completion_rate: float
    current_streak: int
    longest_streak: int
    level: int
    xp: int
    stars: int
    gems: int


class FamilyStats(BaseModel):
    family_completion_rate: float
    total_tasks_assigned: int
    total_tasks_completed: int
    top_performer_id: Optional[int] = None
    top_performer_name: Optional[str] = None
    leaderboard: list[LeaderboardEntry]
