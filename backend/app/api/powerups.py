"""Power-up API endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_db
from ..core.auth import get_current_user
from ..models import User
from ..services import powerups as powerup_service
from ..schemas import powerup as schemas

router = APIRouter(prefix="/powerups", tags=["powerups"])


@router.get("", response_model=list[schemas.PowerUpOut])
async def list_powerups(
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    """List all available power-ups."""
    powerups = await powerup_service.get_all_powerups(db)
    return [
        schemas.PowerUpOut(
            id=p.id,
            name=p.name,
            description=p.description or "",
            icon=p.icon,
            effect_type=p.effect_type,
            effect_value=p.effect_value,
            cost_gems=p.cost_gems,
            max_per_week=p.max_per_week,
        )
        for p in powerups
    ]


@router.get("/active", response_model=list[schemas.PowerUpPurchaseOut])
async def get_active_powerups(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get active (unused) power-ups for the current child."""
    if current_user.role != "child":
        raise HTTPException(status_code=403, detail="Only children can view active power-ups")

    purchases = await powerup_service.get_active_powerups(db, current_user.id)
    result = []
    for purchase in purchases:
        await db.refresh(purchase, ["powerup"])
        result.append(
            schemas.PowerUpPurchaseOut(
                id=purchase.id,
                powerup_id=purchase.powerup_id,
                powerup_name=purchase.powerup.name,
                powerup_icon=purchase.powerup.icon,
                effect_type=purchase.powerup.effect_type,
                effect_value=purchase.powerup.effect_value,
                is_active=True,
                purchased_at=purchase.purchased_at.isoformat() if purchase.purchased_at else "",
                expires_at=purchase.expires_at.isoformat() if purchase.expires_at else None,
            )
        )
    return result


@router.post("/{powerup_id}/purchase", response_model=schemas.PowerUpPurchaseOut)
async def purchase_powerup(
    powerup_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Purchase a power-up for the current child."""
    if current_user.role != "child":
        raise HTTPException(status_code=403, detail="Only children can purchase power-ups")

    try:
        purchase = await powerup_service.purchase_powerup(db, current_user.id, powerup_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    await db.refresh(purchase, ["powerup"])
    return schemas.PowerUpPurchaseOut(
        id=purchase.id,
        powerup_id=purchase.powerup_id,
        powerup_name=purchase.powerup.name,
        powerup_icon=purchase.powerup.icon,
        effect_type=purchase.powerup.effect_type,
        effect_value=purchase.powerup.effect_value,
        is_active=True,
        purchased_at=purchase.purchased_at.isoformat() if purchase.purchased_at else "",
        expires_at=purchase.expires_at.isoformat() if purchase.expires_at else None,
    )
