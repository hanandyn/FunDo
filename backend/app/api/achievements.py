"""Achievements, daily spin, mystery chest, and avatar API routes."""

import json
import random
from datetime import datetime, timezone, date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_db
from ..core.auth import get_current_user
from ..models.user import User
from ..schemas.achievement import (
    SpinResult, ChestResult, AvatarUpdate,
    AchievementResponse, ChildAchievementResponse,
)
from ..services.achievements import (
    get_all_achievements,
    get_child_achievements,
    seed_achievements,
)

router = APIRouter(prefix="/achievements", tags=["achievements"])


@router.get("", response_model=list[AchievementResponse])
async def list_achievements(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all seeded achievements."""
    await seed_achievements(db)
    return await get_all_achievements(db)


@router.get("/child/{child_id}")
async def get_child_achievements_route(
    child_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a child's earned achievements plus all locked ones."""
    if current_user.role == "child" and current_user.id != child_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return await get_child_achievements(db, child_id)


# --- Daily Spin ---

SPIN_PRIZES = [
    {"prize": "10 Stars", "type": "stars", "value": 10, "weight": 30},
    {"prize": "25 Stars", "type": "stars", "value": 25, "weight": 25},
    {"prize": "50 Stars", "type": "stars", "value": 50, "weight": 15},
    {"prize": "100 Stars", "type": "stars", "value": 100, "weight": 5},
    {"prize": "1 Gem 💎", "type": "gems", "value": 1, "weight": 15},
    {"prize": "3 Gems 💎", "type": "gems", "value": 3, "weight": 5},
    {"prize": "Better luck tomorrow!", "type": "nothing", "value": 0, "weight": 5},
]


@router.post("/daily-spin", response_model=SpinResult)
async def daily_spin(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Spin the daily wheel of fortune. Once per day per child."""
    if current_user.role != "child":
        raise HTTPException(status_code=403, detail="Only children can spin")

    today = date.today()
    if current_user.last_daily_spin and current_user.last_daily_spin.date() == today:
        raise HTTPException(status_code=403, detail="Already spun today! Come back tomorrow.")

    # Weighted random selection
    total_weight = sum(p["weight"] for p in SPIN_PRIZES)
    roll = random.randint(1, total_weight)
    cumulative = 0
    prize = SPIN_PRIZES[0]
    for p in SPIN_PRIZES:
        cumulative += p["weight"]
        if roll <= cumulative:
            prize = p
            break

    # Apply prize
    if prize["type"] == "stars":
        current_user.stars += prize["value"]
    elif prize["type"] == "gems":
        current_user.gems += prize["value"]

    current_user.last_daily_spin = datetime.now(timezone.utc)
    await db.commit()

    return SpinResult(
        prize=prize["prize"],
        value=prize["value"],
        prize_type=prize["type"],
        message=f"You got: {prize['prize']}! 🎡"
    )


@router.get("/daily-spin/status")
async def daily_spin_status(
    current_user: User = Depends(get_current_user),
):
    """Check if the daily spin is available."""
    if current_user.role != "child":
        raise HTTPException(status_code=403, detail="Only children can spin")
    today = date.today()
    available = not (current_user.last_daily_spin and current_user.last_daily_spin.date() == today)
    return {"available": available}


# --- Mystery Chest ---

CHEST_REWARDS = {
    "stars": [
        {"value": 50, "weight": 30},
        {"value": 100, "weight": 30},
        {"value": 150, "weight": 20},
        {"value": 200, "weight": 15},
        {"value": 500, "weight": 5},
    ],
    "gems": [
        {"value": 1, "weight": 40},
        {"value": 2, "weight": 30},
        {"value": 3, "weight": 20},
        {"value": 5, "weight": 10},
    ],
    "cosmetic": [
        {"value": 0, "item_name": "Golden Frame", "weight": 25},
        {"value": 0, "item_name": "Sparkle Trail", "weight": 25},
        {"value": 0, "item_name": "Rainbow Name", "weight": 25},
        {"value": 0, "item_name": "Fire Crown", "weight": 25},
    ],
}


@router.post("/mystery-chest")
async def open_mystery_chest(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Open a mystery chest (every 10 completed tasks)."""
    if current_user.role != "child":
        raise HTTPException(status_code=403, detail="Only children can open chests")

    if current_user.completed_since_last_chest < 10:
        raise HTTPException(
            status_code=403,
            detail=f"Complete {10 - current_user.completed_since_last_chest} more tasks to earn a chest!"
        )

    # Choose reward type (70% stars, 20% gems, 10% cosmetic)
    type_roll = random.random()
    if type_roll < 0.70:
        reward_type = "stars"
    elif type_roll < 0.90:
        reward_type = "gems"
    else:
        reward_type = "cosmetic"

    # Weighted selection within type
    pool = CHEST_REWARDS[reward_type]
    total_weight = sum(p["weight"] for p in pool)
    roll = random.randint(1, total_weight)
    cumulative = 0
    chosen = pool[0]
    for p in pool:
        cumulative += p["weight"]
        if roll <= cumulative:
            chosen = p
            break

    value = chosen["value"]
    item_name = chosen.get("item_name")

    # Apply reward
    if reward_type == "stars":
        current_user.stars += value
    elif reward_type == "gems":
        current_user.gems += value
    elif reward_type == "cosmetic" and item_name:
        # Store cosmetic in avatar_config
        avatar = json.loads(current_user.avatar_config or "{}")
        cosmetics = avatar.get("cosmetics", [])
        if item_name not in cosmetics:
            cosmetics.append(item_name)
        avatar["cosmetics"] = cosmetics
        current_user.avatar_config = json.dumps(avatar)

    # Reset chest counter
    current_user.completed_since_last_chest = 0
    await db.commit()

    msg = f"You opened a mystery chest and got: {item_name or f'{value} {reward_type}'}! 🎁"
    return ChestResult(
        reward_type=reward_type,
        value=value,
        item_name=item_name,
        message=msg,
    )


@router.get("/mystery-chest/status")
async def mystery_chest_status(
    current_user: User = Depends(get_current_user),
):
    """Check chest progress."""
    if current_user.role != "child":
        raise HTTPException(status_code=403, detail="Only children")
    return {
        "completed_since_last_chest": current_user.completed_since_last_chest,
        "tasks_until_chest": max(0, 10 - current_user.completed_since_last_chest),
        "chest_available": current_user.completed_since_last_chest >= 10,
    }


# --- Avatar ---

@router.post("/avatar")
async def update_avatar(
    data: AvatarUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update the child's avatar configuration."""
    if current_user.role != "child":
        raise HTTPException(status_code=403, detail="Only children can update avatars")

    # Validate JSON
    try:
        parsed = json.loads(data.avatar_config)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON for avatar_config")

    # Validate structure
    archetype = parsed.get("archetype")
    color = parsed.get("color")
    cosmetics = parsed.get("cosmetics", [])

    valid_archetypes = ["knight", "wizard", "explorer", "ninja", "robot", "artist", "athlete", "scientist"]
    if archetype and archetype not in valid_archetypes:
        raise HTTPException(status_code=400, detail=f"Invalid archetype. Valid: {', '.join(valid_archetypes)}")

    # Check gem cost for premium colors
    premium_colors = {
        "gold": 5, "rainbow": 10, "cosmic": 3, "neon": 3,
        "crimson": 2, "royal": 2, "emerald": 2, "obsidian": 2,
    }
    old_avatar = json.loads(current_user.avatar_config or "{}")
    old_color = old_avatar.get("color")
    
    if color and color in premium_colors and color != old_color:
        cost = premium_colors[color]
        if current_user.gems < cost:
            raise HTTPException(status_code=403, detail=f"Need {cost} gems for {color} color. You have {current_user.gems}.")
        current_user.gems -= cost

    current_user.avatar_config = data.avatar_config
    await db.commit()
    return {"message": "Avatar updated!", "avatar_config": current_user.avatar_config}
