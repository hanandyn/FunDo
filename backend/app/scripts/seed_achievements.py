"""Seed achievements into the database.

Run with: python -m app.scripts.seed_achievements
"""

import asyncio
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import async_session, create_tables
from app.services.achievements import seed_achievements


async def main():
    await create_tables()
    async with async_session() as db:
        achievements = await seed_achievements(db)
        print(f"Seeded {len(achievements)} achievements:")
        for a in achievements:
            print(f"  {a.icon or '•'} {a.name} ({a.rarity}) — {a.description}")
    print("Done!")


if __name__ == "__main__":
    asyncio.run(main())
