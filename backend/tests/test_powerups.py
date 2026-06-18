"""Tests for power-up service and API."""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.powerup import PowerUp, PowerUpPurchase
from app.services.powerups import (
    seed_powerups, get_all_powerups, get_active_powerups,
    purchase_powerup, apply_powerup_effect, get_applied_multipliers,
)


@pytest.mark.asyncio
async def test_seed_powerups(db: AsyncSession):
    """Power-ups should be seed-able and idempotent."""
    pus = await seed_powerups(db)
    assert len(pus) == 5

    # Seed again — should return same ones
    pus2 = await seed_powerups(db)
    assert len(pus2) == 5


@pytest.mark.asyncio
async def test_get_all_powerups(db: AsyncSession):
    """Should return all active power-ups."""
    await seed_powerups(db)
    pus = await get_all_powerups(db)
    assert len(pus) >= 5
    assert all(p.is_active for p in pus)


@pytest.mark.asyncio
async def test_purchase_powerup_insufficient_gems(db: AsyncSession, sample_child: dict):
    """Should raise ValueError when child doesn't have enough gems."""
    await seed_powerups(db)
    pus = await get_all_powerups(db)

    # sample_child starts with 0 gems by default
    with pytest.raises(ValueError, match="Not enough gems"):
        await purchase_powerup(db, sample_child["id"], pus[0].id)


@pytest.mark.asyncio
async def test_apply_double_points(db: AsyncSession, sample_child: dict):
    """Double Points power-up should return 2.0 multiplier."""
    await seed_powerups(db)
    # Give child some gems
    from app.models.user import User
    from sqlalchemy import select
    child = (await db.execute(select(User).where(User.id == sample_child["id"]))).scalar_one()
    child.gems = 20
    await db.commit()

    pus = await get_all_powerups(db)
    double_points = next(p for p in pus if p.effect_type == "double_points")

    # Purchase
    purchase = await purchase_powerup(db, sample_child["id"], double_points.id)
    assert purchase.is_active

    # Apply
    value = await apply_powerup_effect(db, sample_child["id"], "double_points")
    assert value == 2.0

    # Should be used now
    active_after = await get_active_powerups(db, sample_child["id"])
    assert len(active_after) == 0


@pytest.mark.asyncio
async def test_mystery_boost_random_range(db: AsyncSession, sample_child: dict):
    """Mystery Boost effect value should be between 1.5 and 5.0."""
    await seed_powerups(db)
    from app.models.user import User
    from sqlalchemy import select
    child = (await db.execute(select(User).where(User.id == sample_child["id"]))).scalar_one()
    child.gems = 20
    await db.commit()

    pus = await get_all_powerups(db)
    mystery = next(p for p in pus if p.effect_type == "mystery_boost")
    await purchase_powerup(db, sample_child["id"], mystery.id)

    # Must re-load to break cache
    child.gems = 20
    await db.flush()

    value = await apply_powerup_effect(db, sample_child["id"], "mystery_boost")
    assert 1.5 <= value <= 5.0


@pytest.mark.asyncio
async def test_apply_nonexistent_powerup(db: AsyncSession, sample_child: dict):
    """Applying a power-up the child doesn't have should return None."""
    value = await apply_powerup_effect(db, sample_child["id"], "double_points")
    assert value is None


@pytest.mark.asyncio
async def test_get_applied_multipliers(db: AsyncSession, sample_child: dict):
    """Should return all active multipliers."""
    await seed_powerups(db)
    from app.models.user import User
    from sqlalchemy import select
    child = (await db.execute(select(User).where(User.id == sample_child["id"]))).scalar_one()
    child.gems = 50
    await db.commit()

    pus = await get_all_powerups(db)
    double_points = next(p for p in pus if p.effect_type == "double_points")
    streak_shield = next(p for p in pus if p.effect_type == "streak_shield")

    await purchase_powerup(db, child.id, double_points.id)
    child.gems = 50
    await db.flush()
    await purchase_powerup(db, child.id, streak_shield.id)
    # re-attach
    child = (await db.execute(select(User).where(User.id == child.id))).scalar_one()
    # give more gems
    child.gems = 50
    await db.commit()

    # Both should be active
    active = await get_active_powerups(db, child.id)
    assert len(active) == 2
