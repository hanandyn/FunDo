"""Avatar customization API — shop, inventory, equip."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from ..core.database import get_db
from ..core.auth import get_current_user
from ..models.user import User
from ..models.avatar import AvatarItem, ChildAvatarItem

router = APIRouter(prefix="/avatars", tags=["avatars"])


@router.get("/shop")
async def get_avatar_shop(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all avatar items available in the gem/star shop."""
    result = await db.execute(
        select(AvatarItem).where(AvatarItem.available_in_shop == True)
    )
    items = result.scalars().all()

    # Get what the user already owns
    owned_result = await db.execute(
        select(ChildAvatarItem).where(ChildAvatarItem.child_id == current_user.id)
    )
    owned_items = owned_result.scalars().all()
    owned_ids = {oi.item_id for oi in owned_items}

    return [
        {
            "id": item.id,
            "item_name": item.item_name,
            "item_type": item.item_type,
            "slot": item.slot,
            "rarity": item.rarity,
            "emoji": item.emoji,
            "color": item.color,
            "cost_gems": item.cost_gems,
            "cost_stars": item.cost_stars,
            "owned": item.id in owned_ids,
        }
        for item in items
    ]


@router.get("/items")
async def get_owned_items(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all avatar items owned by the current user."""
    result = await db.execute(
        select(ChildAvatarItem)
        .where(ChildAvatarItem.child_id == current_user.id)
    )
    owned = result.scalars().all()

    items = []
    for oi in owned:
        item_result = await db.execute(select(AvatarItem).where(AvatarItem.id == oi.item_id))
        item = item_result.scalar_one_or_none()
        if item:
            items.append({
                "id": oi.id,
                "item_id": item.id,
                "item_name": item.item_name,
                "item_type": item.item_type,
                "slot": item.slot,
                "rarity": item.rarity,
                "emoji": item.emoji,
                "color": item.color,
                "equipped": oi.equipped,
                "acquired_at": oi.acquired_at.isoformat() if oi.acquired_at else None,
            })

    return items


@router.post("/shop/{item_id}/buy")
async def buy_avatar_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Buy an avatar item from the shop with gems or stars."""
    if current_user.role != "child":
        raise HTTPException(status_code=403, detail="Only children can buy items")

    # Get item
    result = await db.execute(select(AvatarItem).where(AvatarItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item or not item.available_in_shop:
        raise HTTPException(status_code=404, detail="Item not found in shop")

    # Check if already owned
    existing = await db.execute(
        select(ChildAvatarItem).where(
            and_(ChildAvatarItem.child_id == current_user.id, ChildAvatarItem.item_id == item_id)
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="You already own this item")

    # Check balance
    if item.cost_gems > current_user.gems:
        raise HTTPException(status_code=403, detail=f"Not enough gems. Need {item.cost_gems}, have {current_user.gems}")
    if item.cost_stars > current_user.stars:
        raise HTTPException(status_code=403, detail=f"Not enough stars. Need {item.cost_stars}, have {current_user.stars}")

    # Deduct and grant
    current_user.gems -= item.cost_gems
    current_user.stars -= item.cost_stars

    child_item = ChildAvatarItem(
        child_id=current_user.id,
        item_id=item_id,
        equipped=0,
    )
    db.add(child_item)
    await db.commit()
    await db.refresh(child_item)

    return {
        "message": f"You bought {item.item_name}! 🛍️",
        "item_id": item_id,
        "item_name": item.item_name,
        "gems_remaining": current_user.gems,
        "stars_remaining": current_user.stars,
    }


@router.post("/equip/{child_avatar_item_id}")
async def equip_item(
    child_avatar_item_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Equip an owned avatar item. Unequips items in the same slot."""
    if current_user.role != "child":
        raise HTTPException(status_code=403, detail="Only children can equip items")

    # Get the child_avatar_item
    result = await db.execute(
        select(ChildAvatarItem).where(ChildAvatarItem.id == child_avatar_item_id)
    )
    cai = result.scalar_one_or_none()
    if not cai or cai.child_id != current_user.id:
        raise HTTPException(status_code=404, detail="Item not found")

    # Get the item to know its slot
    item_result = await db.execute(select(AvatarItem).where(AvatarItem.id == cai.item_id))
    item = item_result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Avatar item not found")

    slot = item.slot

    # If equipping, unequip everything else in the same slot
    if slot:
        all_owned = await db.execute(
            select(ChildAvatarItem)
            .join(AvatarItem, ChildAvatarItem.item_id == AvatarItem.id)
            .where(
                and_(
                    ChildAvatarItem.child_id == current_user.id,
                    AvatarItem.slot == slot,
                    ChildAvatarItem.equipped == 1,
                )
            )
        )
        for equipped in all_owned.scalars().all():
            equipped.equipped = 0

    # Toggle equip: if already equipped, unequip; otherwise equip
    if cai.equipped:
        cai.equipped = 0
        message = f"{item.item_name} unequipped"
    else:
        cai.equipped = 1
        message = f"{item.item_name} equipped! ✨"

    await db.commit()
    return {"message": message, "item_id": item.id, "equipped": cai.equipped == 1 if True else False}


@router.post("/unequip/{child_avatar_item_id}")
async def unequip_item(
    child_avatar_item_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Unequip an avatar item."""
    if current_user.role != "child":
        raise HTTPException(status_code=403, detail="Only children can unequip items")

    result = await db.execute(
        select(ChildAvatarItem).where(ChildAvatarItem.id == child_avatar_item_id)
    )
    cai = result.scalar_one_or_none()
    if not cai or cai.child_id != current_user.id:
        raise HTTPException(status_code=404, detail="Item not found")

    cai.equipped = 0
    await db.commit()
    return {"message": "Unequipped"}
