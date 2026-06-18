"""PowerUp models — purchasable boosts for the kids."""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..core.database import Base


class PowerUp(Base):
    __tablename__ = "powerups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    icon = Column(String, default="⚡")
    effect_type = Column(String, nullable=False)  # double_points, streak_shield, time_freeze, mystery_boost, skip_pass
    effect_value = Column(Float, nullable=False)    # multiplier or minutes or count
    cost_gems = Column(Integer, nullable=False)
    max_per_week = Column(Integer, default=0)       # 0 = unlimited
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    purchases = relationship("PowerUpPurchase", back_populates="powerup")


class PowerUpPurchase(Base):
    __tablename__ = "powerup_purchases"

    id = Column(Integer, primary_key=True, index=True)
    powerup_id = Column(Integer, ForeignKey("powerups.id"), nullable=False)
    child_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_active = Column(Boolean, default=True)        # Active until used
    used_at = Column(DateTime(timezone=True), nullable=True)
    purchased_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)  # Optional expiry

    powerup = relationship("PowerUp", back_populates="purchases")
