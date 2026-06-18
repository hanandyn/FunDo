"""Streak and achievement models."""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Date, JSON, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..core.database import Base


class StreakHistory(Base):
    __tablename__ = "streak_history"

    id = Column(Integer, primary_key=True, index=True)
    child_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False)
    tasks_completed = Column(Integer, default=0)
    tasks_total = Column(Integer, default=0)
    streak_day_number = Column(Integer, default=0)
    streak_protected = Column(Boolean, default=False)  # freeze token used


class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    icon = Column(String, nullable=True)  # emoji or icon name
    rarity = Column(String, default="common")  # common, rare, epic, legendary
    unlock_criteria = Column(JSON, nullable=False)  # {"type": "streak", "value": 7} etc.


class ChildAchievement(Base):
    __tablename__ = "child_achievements"

    id = Column(Integer, primary_key=True, index=True)
    child_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    achievement_id = Column(Integer, ForeignKey("achievements.id"), nullable=False)
    unlocked_at = Column(DateTime(timezone=True), server_default=func.now())

    child = relationship("User", back_populates="achievements")
    achievement = relationship("Achievement")
