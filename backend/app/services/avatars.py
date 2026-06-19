"""Seed default avatar items into the shop."""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from ..models.avatar import AvatarItem


DEFAULT_ITEMS = [
    # Outfits
    {"item_name": "Space Explorer Suit", "item_type": "outfit", "slot": "body", "rarity": "rare", "emoji": "🚀", "color": "#4A90D9", "cost_gems": 15, "cost_stars": 0, "available_in_shop": True, "available_in_chest": True, "available_in_spin": False},
    {"item_name": "Rainbow Cape", "item_type": "outfit", "slot": "body", "rarity": "epic", "emoji": "🌈", "color": "#FF69B4", "cost_gems": 30, "cost_stars": 0, "available_in_shop": True, "available_in_chest": False, "available_in_spin": True},
    {"item_name": "Dragon Wings", "item_type": "outfit", "slot": "body", "rarity": "legendary", "emoji": "🐲", "color": "#FF4500", "cost_gems": 50, "cost_stars": 0, "available_in_shop": True, "available_in_chest": False, "available_in_spin": True},
    {"item_name": "Pirate Costume", "item_type": "outfit", "slot": "body", "rarity": "common", "emoji": "🏴‍☠️", "color": "#8B0000", "cost_gems": 5, "cost_stars": 100, "available_in_shop": True, "available_in_chest": True, "available_in_spin": False},
    {"item_name": "Fairy Dress", "item_type": "outfit", "slot": "body", "rarity": "rare", "emoji": "🧚", "color": "#DDA0DD", "cost_gems": 15, "cost_stars": 0, "available_in_shop": True, "available_in_chest": True, "available_in_spin": False},
    {"item_name": "Ninja Gi", "item_type": "outfit", "slot": "body", "rarity": "common", "emoji": "🥷", "color": "#2F4F4F", "cost_gems": 5, "cost_stars": 100, "available_in_shop": True, "available_in_chest": True, "available_in_spin": False},
    {"item_name": "Royal Robe", "item_type": "outfit", "slot": "body", "rarity": "epic", "emoji": "👑", "color": "#FFD700", "cost_gems": 25, "cost_stars": 0, "available_in_shop": True, "available_in_chest": False, "available_in_spin": True},
    {"item_name": "Superhero Cape", "item_type": "outfit", "slot": "body", "rarity": "rare", "emoji": "🦸", "color": "#FF0000", "cost_gems": 15, "cost_stars": 0, "available_in_shop": True, "available_in_chest": True, "available_in_spin": False},

    # Pets
    {"item_name": "Pixel Cat", "item_type": "pet", "slot": "pet", "rarity": "common", "emoji": "🐱", "color": None, "cost_gems": 10, "cost_stars": 200, "available_in_shop": True, "available_in_chest": True, "available_in_spin": False},
    {"item_name": "Baby Dragon", "item_type": "pet", "slot": "pet", "rarity": "epic", "emoji": "🐉", "color": None, "cost_gems": 35, "cost_stars": 0, "available_in_shop": True, "available_in_chest": False, "available_in_spin": True},
    {"item_name": "Robot Dog", "item_type": "pet", "slot": "pet", "rarity": "rare", "emoji": "🐕", "color": "#808080", "cost_gems": 20, "cost_stars": 0, "available_in_shop": True, "available_in_chest": True, "available_in_spin": False},
    {"item_name": "Unicorn Pet", "item_type": "pet", "slot": "pet", "rarity": "legendary", "emoji": "🦄", "color": None, "cost_gems": 45, "cost_stars": 0, "available_in_shop": True, "available_in_chest": False, "available_in_spin": True},
    {"item_name": "Owl Buddy", "item_type": "pet", "slot": "pet", "rarity": "common", "emoji": "🦉", "color": None, "cost_gems": 8, "cost_stars": 150, "available_in_shop": True, "available_in_chest": True, "available_in_spin": False},

    # Accessories (head)
    {"item_name": "Wizard Hat", "item_type": "accessory", "slot": "head", "rarity": "common", "emoji": "🎩", "color": "#4B0082", "cost_gems": 5, "cost_stars": 50, "available_in_shop": True, "available_in_chest": True, "available_in_spin": True},
    {"item_name": "Crown", "item_type": "accessory", "slot": "head", "rarity": "epic", "emoji": "👑", "color": "#FFD700", "cost_gems": 20, "cost_stars": 0, "available_in_shop": True, "available_in_chest": False, "available_in_spin": True},
    {"item_name": "Flower Crown", "item_type": "accessory", "slot": "head", "rarity": "common", "emoji": "🌸", "color": "#FF69B4", "cost_gems": 3, "cost_stars": 0, "available_in_shop": True, "available_in_chest": True, "available_in_spin": False},
    {"item_name": "Headphones", "item_type": "accessory", "slot": "head", "rarity": "common", "emoji": "🎧", "color": "#333333", "cost_gems": 3, "cost_stars": 50, "available_in_shop": True, "available_in_chest": True, "available_in_spin": False},
    {"item_name": "Halo", "item_type": "accessory", "slot": "head", "rarity": "rare", "emoji": "😇", "color": "#FFE4B5", "cost_gems": 12, "cost_stars": 0, "available_in_shop": True, "available_in_chest": True, "available_in_spin": False},

    # Accessories (accessory slot on body)
    {"item_name": "Sparkle Trail", "item_type": "accessory", "slot": "accessory", "rarity": "rare", "emoji": "✨", "color": "#FFD700", "cost_gems": 10, "cost_stars": 0, "available_in_shop": True, "available_in_chest": True, "available_in_spin": True},
    {"item_name": "Bubble Shield", "item_type": "accessory", "slot": "accessory", "rarity": "epic", "emoji": "🫧", "color": "#87CEEB", "cost_gems": 18, "cost_stars": 0, "available_in_shop": True, "available_in_chest": False, "available_in_spin": True},

    # Backgrounds
    {"item_name": "Starry Night", "item_type": "background", "slot": "background", "rarity": "rare", "emoji": "🌌", "color": "#191970", "cost_gems": 12, "cost_stars": 0, "available_in_shop": True, "available_in_chest": True, "available_in_spin": False},
    {"item_name": "Beach Sunset", "item_type": "background", "slot": "background", "rarity": "common", "emoji": "🏖️", "color": "#FF7F50", "cost_gems": 5, "cost_stars": 100, "available_in_shop": True, "available_in_chest": True, "available_in_spin": False},
    {"item_name": "Castle Throne Room", "item_type": "background", "slot": "background", "rarity": "epic", "emoji": "🏰", "color": "#4B0082", "cost_gems": 22, "cost_stars": 0, "available_in_shop": True, "available_in_chest": False, "available_in_spin": True},
    {"item_name": "Outer Space", "item_type": "background", "slot": "background", "rarity": "legendary", "emoji": "🌠", "color": "#000000", "cost_gems": 40, "cost_stars": 0, "available_in_shop": True, "available_in_chest": False, "available_in_spin": True},

    # Name Colors
    {"item_name": "Gold Name", "item_type": "name_color", "slot": "name_color", "rarity": "rare", "emoji": "🥇", "color": "#FFD700", "cost_gems": 8, "cost_stars": 0, "available_in_shop": True, "available_in_chest": True, "available_in_spin": True},
    {"item_name": "Rainbow Name", "item_type": "name_color", "slot": "name_color", "rarity": "epic", "emoji": "🌈", "color": "rainbow", "cost_gems": 20, "cost_stars": 0, "available_in_shop": True, "available_in_chest": False, "available_in_spin": True},
    {"item_name": "Neon Pink Name", "item_type": "name_color", "slot": "name_color", "rarity": "common", "emoji": "💖", "color": "#FF1493", "cost_gems": 3, "cost_stars": 0, "available_in_shop": True, "available_in_chest": True, "available_in_spin": False},
    {"item_name": "Ice Blue Name", "item_type": "name_color", "slot": "name_color", "rarity": "common", "emoji": "❄️", "color": "#00BFFF", "cost_gems": 3, "cost_stars": 0, "available_in_shop": True, "available_in_chest": True, "available_in_spin": False},
]


async def seed_avatar_items(db: AsyncSession):
    """Ensure default avatar items exist. Idempotent — only inserts if missing."""
    from sqlalchemy import select
    result = await db.execute(select(func.count(AvatarItem.id)))
    count = result.scalar() or 0
    if count > 0:
        return  # already seeded

    for item_data in DEFAULT_ITEMS:
        item = AvatarItem(**item_data)
        db.add(item)
    await db.commit()
