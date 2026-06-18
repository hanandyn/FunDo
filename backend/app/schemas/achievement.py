"""Pydantic schemas for achievements."""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class AchievementResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    rarity: str
    unlock_criteria: dict

    model_config = {"from_attributes": True}


class ChildAchievementResponse(BaseModel):
    id: int
    child_id: int
    achievement_id: int
    unlocked_at: datetime
    achievement: Optional[AchievementResponse] = None

    model_config = {"from_attributes": True}


class SpinResult(BaseModel):
    prize: str
    value: int
    prize_type: str  # "stars", "gems", "nothing"
    message: str


class ChestResult(BaseModel):
    reward_type: str  # "stars", "gems", "cosmetic"
    value: int
    item_name: Optional[str] = None
    message: str


class AvatarUpdate(BaseModel):
    avatar_config: str  # JSON string
