"""Power-up service — purchase, activate, and apply power-up effects."""

import random
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func

from ..models.powerup import PowerUp, PowerUpPurchase
from ..models.user import User


POWERUP_SEEDS = [
    {
        "name": "Double Points",
        "description": "2× points on your next completed task",
        "icon": "💥",
        "effect_type": "double_points",
        "effect_value": 2.0,
        "cost_gems": 5,
    },
    {
        "name": "Streak Shield",
        "description": "Protects your streak for one missed day",
        "icon": "🛡️",
        "effect_type": "streak_shield",
        "effect_value": 1.0,
        "cost_gems": 10,
    },
    {
        "name": "Time Freeze",
        "description": "Adds 5 minutes to any timer",
        "icon": "❄️",
        "effect_type": "time_freeze",
        "effect_value": 300.0,  # 5 minutes in seconds
        "cost_gems": 8,
    },
    {
        "name": "Mystery Boost",
        "description": "Random 1.5× to 5× multiplier on next task",
        "icon": "🎲",
        "effect_type": "mystery_boost",
        "effect_value": 0,  # computed at use time
        "cost_gems": 3,
    },
    {
        "name": "Skip Pass",
        "description": "Skip one task without penalty (once per week)",
        "icon": "🎫",
        "effect_type": "skip_pass",
        "effect_value": 1.0,
        "cost_gems": 15,
        "max_per_week": 1,
    },
]


async def seed_powerups(db: AsyncSession) -> list[PowerUp]:
    """Create power-ups if they don't already exist."""
    existing = (await db.execute(select(PowerUp))).scalars().all()
    if existing:
        return list(existing)

    powerups = []
    for seed in POWERUP_SEEDS:
        pu = PowerUp(
            name=seed["name"],
            description=seed["description"],
            icon=seed["icon"],
            effect_type=seed["effect_type"],
            effect_value=seed["effect_value"],
            cost_gems=seed["cost_gems"],
            max_per_week=seed.get("max_per_week", 0),
        )
        db.add(pu)
        powerups.append(pu)

    await db.commit()
    return powerups


async def get_all_powerups(db: AsyncSession) -> list[PowerUp]:
    """Return all active power-ups."""
    result = await db.execute(
        select(PowerUp).where(PowerUp.is_active == True).order_by(PowerUp.cost_gems)
    )
    return list(result.scalars().all())


async def get_active_powerups(db: AsyncSession, child_id: int) -> list[PowerUpPurchase]:
    """Get active (unused) power-up purchases for a child."""
    result = await db.execute(
        select(PowerUpPurchase).where(
            and_(
                PowerUpPurchase.child_id == child_id,
                PowerUpPurchase.is_active == True,
            )
        )
    )
    return list(result.scalars().all())


async def purchase_powerup(
    db: AsyncSession, child_id: int, powerup_id: int
) -> PowerUpPurchase:
    """Purchase a power-up. Deducts gems from child."""
    # Get child
    child_result = await db.execute(select(User).where(User.id == child_id))
    child = child_result.scalar_one_or_none()
    if not child:
        raise ValueError("Child not found")

    # Get power-up
    pu_result = await db.execute(select(PowerUp).where(PowerUp.id == powerup_id))
    powerup = pu_result.scalar_one_or_none()
    if not powerup or not powerup.is_active:
        raise ValueError("Power-up not available")

    # Check gems
    if child.gems < powerup.cost_gems:
        raise ValueError(f"Not enough gems. Need {powerup.cost_gems}, have {child.gems}")

    # Check weekly limit
    if powerup.max_per_week > 0:
        now = datetime.now(timezone.utc)
        week_ago = now - timedelta(days=7)
        weekly_count = await db.execute(
            select(func.count(PowerUpPurchase.id)).where(
                and_(
                    PowerUpPurchase.powerup_id == powerup_id,
                    PowerUpPurchase.child_id == child_id,
                    PowerUpPurchase.purchased_at >= week_ago,
                )
            )
        )
        count = weekly_count.scalar()
        if count and count >= powerup.max_per_week:
            raise ValueError(f"You can only buy {powerup.max_per_week} per week of this power-up")

    # Deduct gems
    child.gems -= powerup.cost_gems

    # Create purchase
    purchase = PowerUpPurchase(
        powerup_id=powerup_id,
        child_id=child_id,
        is_active=True,
        expires_at=now + timedelta(days=7) if powerup.max_per_week else None,
    )
    db.add(purchase)
    await db.commit()
    await db.refresh(purchase)
    return purchase


async def apply_powerup_effect(
    db: AsyncSession, child_id: int, effect_type: str
) -> float | None:
    """Apply a power-up effect. Returns the effect value if applied, None if no active power-up.
    
    Marks the power-up as used after application.
    """
    # Find active purchase with matching effect, eager load powerup
    result = await db.execute(
        select(PowerUpPurchase).join(PowerUp).where(
            and_(
                PowerUpPurchase.child_id == child_id,
                PowerUpPurchase.is_active == True,
                PowerUp.effect_type == effect_type,
            )
        )
    )
    purchase = result.scalars().first()
    if not purchase:
        return None

    await db.refresh(purchase, ["powerup"])
    powerup = purchase.powerup

    # Mark as used
    purchase.is_active = False
    purchase.used_at = datetime.now(timezone.utc)
    await db.commit()

    if effect_type == "mystery_boost":
        # Random between 1.5 and 5.0
        value = random.uniform(1.5, 5.0)
        return round(value, 1)

    return powerup.effect_value


async def get_applied_multipliers(db: AsyncSession, child_id: int) -> dict:
    """Get all currently active multipliers for the child. Returns a dict of effect_type → value."""
    active = await get_active_powerups(db, child_id)
    multipliers: dict[str, float] = {}
    for purchase in active:
        await db.refresh(purchase, ["powerup"])
        pu = purchase.powerup
        multipliers[pu.effect_type] = pu.effect_value
    return multipliers
