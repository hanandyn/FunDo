"""Tests for Phase 7: Adaptive UI & Enhanced Gamification features."""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User, Family
from app.models.avatar import AvatarItem, ChildAvatarItem
from app.core.security import hash_password


class TestAvatarModel:
    """Test avatar item model creation."""

    async def test_avatar_item_creation(self, db: AsyncSession):
        item = AvatarItem(
            item_name="Test Crown",
            item_type="accessory",
            slot="head",
            rarity="epic",
            emoji="👑",
            cost_gems=20,
            available_in_shop=True,
            available_in_chest=True,
        )
        db.add(item)
        await db.commit()
        await db.refresh(item)
        assert item.id is not None
        assert item.item_name == "Test Crown"
        assert item.item_type == "accessory"
        assert item.rarity == "epic"

    async def test_child_avatar_item(self, db: AsyncSession):
        # Create family + child
        family = Family(name="Test Family")
        db.add(family)
        await db.flush()

        child = User(
            username="avatarchild",
            display_name="Avatar Child",
            hashed_password=hash_password("pass"),
            role="child",
            family_id=family.id,
            age_tier=2,
            gems=50,
        )
        db.add(child)
        await db.flush()

        # Create shop item
        item = AvatarItem(
            item_name="Cool Hat",
            item_type="accessory",
            slot="head",
            rarity="common",
            emoji="🎩",
            cost_gems=5,
        )
        db.add(item)
        await db.flush()

        # Grant to child
        child_item = ChildAvatarItem(
            child_id=child.id,
            item_id=item.id,
            equipped=1,
        )
        db.add(child_item)
        await db.commit()
        await db.refresh(child_item)

        assert child_item.id is not None
        assert child_item.equipped == 1
        assert child_item.item_id == item.id


class TestTier1:
    """Test Tier 1 (Little Explorers) features."""

    async def test_tier1_task_has_icon_field(self, db: AsyncSession):
        from app.models.task import TaskTemplate
        # Create a task with icon
        family = Family(name="Tier1 Fam")
        db.add(family)
        await db.flush()

        parent = User(
            username="tier1parent",
            display_name="Parent",
            hashed_password=hash_password("pass"),
            role="parent",
            family_id=family.id,
        )
        db.add(parent)
        await db.flush()

        template = TaskTemplate(
            family_id=family.id,
            created_by_id=parent.id,
            name="Brush Teeth",
            icon="🪥",
            audio_prompt="Time to brush your teeth!",
            task_type="one_shot",
            base_points=10,
        )
        db.add(template)
        await db.commit()
        await db.refresh(template)

        assert template.icon == "🪥"
        assert template.audio_prompt == "Time to brush your teeth!"


class TestAllowance:
    """Test allowance features."""

    async def test_child_allowance_fields(self, db: AsyncSession):
        family = Family(name="Allowance Fam")
        db.add(family)
        await db.flush()

        child = User(
            username="teenchild",
            display_name="Teen Kid",
            hashed_password=hash_password("pass"),
            role="child",
            family_id=family.id,
            age_tier=4,
            stars=500,
            allowance_rate=10,  # 10 stars per currency unit
            allowance_currency="USD",
            savings_goal=50,
        )
        db.add(child)
        await db.commit()
        await db.refresh(child)

        assert child.allowance_rate == 10
        assert child.allowance_currency == "USD"
        assert child.savings_goal == 50

        # Calculate allowance
        amount = child.stars / child.allowance_rate
        assert amount == 50.0
        assert amount >= child.savings_goal


class TestAvatarSeeding:
    """Test avatar item seeding."""

    async def test_seed_creates_items(self, db: AsyncSession):
        from app.services.avatars import seed_avatar_items
        from sqlalchemy import func

        await seed_avatar_items(db)

        result = await db.execute(select(func.count(AvatarItem.id)))
        count = result.scalar()
        assert count > 0, "Seed should create avatar items"

    async def test_seed_is_idempotent(self, db: AsyncSession):
        from app.services.avatars import seed_avatar_items
        from sqlalchemy import func

        await seed_avatar_items(db)
        result = await db.execute(select(func.count(AvatarItem.id)))
        count1 = result.scalar()

        await seed_avatar_items(db)
        result = await db.execute(select(func.count(AvatarItem.id)))
        count2 = result.scalar()

        assert count1 == count2, "Seed should be idempotent"
