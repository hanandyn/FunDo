"""Allowance API — link stars to real-world allowance for teens (ages 13+)."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from ..core.database import get_db
from ..core.auth import get_current_user, get_current_parent
from ..models.user import User

router = APIRouter(prefix="/allowance", tags=["allowance"])


class AllowanceSettingsInput(BaseModel):
    child_id: int
    allowance_rate: int = 0  # stars per currency unit; 0 = disabled
    allowance_currency: str = "USD"
    savings_goal: int = 0  # in currency units


class SavingsGoalInput(BaseModel):
    goal: int = 0


@router.get("/status")
async def get_allowance_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get allowance status for a child. Teens see their own; parents see any child's."""
    if current_user.role == "child" and current_user.age_tier and current_user.age_tier < 4:
        raise HTTPException(status_code=403, detail="Allowance is for teens (age 13+) only")
    
    allowance_rate = current_user.allowance_rate or 0
    currency = current_user.allowance_currency or "USD"
    savings_goal = current_user.savings_goal or 0
    stars = current_user.stars or 0

    # Calculate allowance amount
    if allowance_rate > 0:
        allowance_amount = stars / allowance_rate
        # If savings goal is set
        progress = (allowance_amount / savings_goal * 100) if savings_goal > 0 else 0
    else:
        allowance_amount = 0
        progress = 0

    return {
        "allowance_rate": allowance_rate,
        "currency": currency,
        "stars": stars,
        "allowance_amount": round(allowance_amount, 2),
        "savings_goal": savings_goal,
        "progress_percent": min(100, round(progress, 1)),
        "enabled": allowance_rate > 0,
    }


@router.post("/goal")
async def set_savings_goal(
    data: SavingsGoalInput,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Set a savings goal. Teens can set their own goal."""
    if current_user.role == "child" and current_user.age_tier and current_user.age_tier < 4:
        raise HTTPException(status_code=403, detail="Allowance is for teens (age 13+) only")

    current_user.savings_goal = data.goal
    await db.commit()

    return {
        "message": f"Savings goal set to {data.goal} {current_user.allowance_currency or 'USD'}",
        "savings_goal": current_user.savings_goal,
    }


@router.put("/settings")
async def update_allowance_settings(
    data: AllowanceSettingsInput,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """Parent configures allowance for a child."""
    from sqlalchemy import select

    # Verify child belongs to this family
    result = await db.execute(select(User).where(User.id == data.child_id))
    child = result.scalar_one_or_none()
    if not child or child.family_id != current_user.family_id:
        raise HTTPException(status_code=404, detail="Child not found")
    if child.role != "child":
        raise HTTPException(status_code=403, detail="Not a child account")

    child.allowance_rate = data.allowance_rate
    child.allowance_currency = data.allowance_currency
    child.savings_goal = data.savings_goal
    await db.commit()

    return {
        "message": "Allowance settings updated",
        "child_id": child.id,
        "allowance_rate": child.allowance_rate,
        "currency": child.allowance_currency,
        "savings_goal": child.savings_goal,
    }
