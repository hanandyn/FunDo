"""Power-up schemas for API."""

from pydantic import BaseModel


class PowerUpOut(BaseModel):
    id: int
    name: str
    description: str
    icon: str
    effect_type: str
    effect_value: float
    cost_gems: int
    max_per_week: int

    class Config:
        from_attributes = True


class PowerUpPurchaseOut(BaseModel):
    id: int
    powerup_id: int
    powerup_name: str
    powerup_icon: str
    effect_type: str
    effect_value: float
    is_active: bool
    purchased_at: str
    expires_at: str | None = None

    class Config:
        from_attributes = True
