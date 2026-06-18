"""Tests for the achievements service, daily spin, and mystery chest."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import json
from datetime import datetime, timezone, date, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.services.achievements import (
    seed_achievements,
    get_all_achievements,
    check_and_award_achievements,
)
from app.models.user import User, Family
from app.models.streak import Achievement, ChildAchievement


class TestAchievementService:
    async def test_seed_creates_achievements(self, db_session: AsyncSession):
        achievements = await seed_achievements(db_session)
        assert len(achievements) >= 20
        names = {a.name for a in achievements}
        assert "First Steps" in names
        assert "Week Warrior" in names
        assert "Mythic" in names
        assert "Jackpot" in names

    async def test_seed_idempotent(self, db_session: AsyncSession):
        first = await seed_achievements(db_session)
        second = await seed_achievements(db_session)
        assert len(first) == len(second)

    async def test_get_all_achievements(self, db_session: AsyncSession):
        await seed_achievements(db_session)
        all_achs = await get_all_achievements(db_session)
        assert len(all_achs) >= 20


class TestCheckAndAward:
    async def test_first_steps_awarded_on_first_completion(self, db_session: AsyncSession):
        await seed_achievements(db_session)
        family = Family(name="Test Family")
        db_session.add(family)
        await db_session.flush()
        child = User(
            username="testchild", display_name="Test Child",
            hashed_password="hash", role="child", family_id=family.id,
            total_tasks_completed=1, level=1,
        )
        db_session.add(child)
        await db_session.flush()

        earned = await check_and_award_achievements(db_session, child)
        assert len(earned) >= 1
        names = [a["name"] for a in earned]
        assert "First Steps" in names

    async def test_level_achievements(self, db_session: AsyncSession):
        await seed_achievements(db_session)
        family = Family(name="Test Family 2")
        db_session.add(family)
        await db_session.flush()
        child = User(
            username="testchild2", display_name="Test Child 2",
            hashed_password="hash", role="child", family_id=family.id,
            level=5, total_tasks_completed=5,
        )
        db_session.add(child)
        await db_session.flush()

        earned = await check_and_award_achievements(db_session, child)
        names = [a["name"] for a in earned]
        assert "Tiny Helper" in names

    async def test_no_duplicate_awards(self, db_session: AsyncSession):
        await seed_achievements(db_session)
        family = Family(name="Test Family 3")
        db_session.add(family)
        await db_session.flush()
        child = User(
            username="testchild3", display_name="Test Child 3",
            hashed_password="hash", role="child", family_id=family.id,
            total_tasks_completed=1, level=1,
        )
        db_session.add(child)
        await db_session.flush()

        first = await check_and_award_achievements(db_session, child)
        second = await check_and_award_achievements(db_session, child)
        assert len(second) == 0  # No new achievements on second call

    async def test_jackpot_achievement(self, db_session: AsyncSession):
        await seed_achievements(db_session)
        family = Family(name="Test Family 4")
        db_session.add(family)
        await db_session.flush()
        child = User(
            username="testchild4", display_name="Test Child 4",
            hashed_password="hash", role="child", family_id=family.id,
            level=1, total_tasks_completed=1,
        )
        db_session.add(child)
        await db_session.flush()

        scoring = {"random_multiplier": 5}
        earned = await check_and_award_achievements(
            db_session, child, scoring_result=scoring
        )
        # Jackpot may or may not be earned based on previous awards
        names = [a["name"] for a in earned]
        assert "Jackpot" in names

    async def test_bonus_task_achievement(self, db_session: AsyncSession):
        await seed_achievements(db_session)
        family = Family(name="Test Family 5")
        db_session.add(family)
        await db_session.flush()
        child = User(
            username="testchild5", display_name="Test Child 5",
            hashed_password="hash", role="child", family_id=family.id,
            total_tasks_completed=1, level=1,
        )
        db_session.add(child)
        await db_session.flush()

        earned = await check_and_award_achievements(
            db_session, child, task_type="bonus"
        )
        names = [a["name"] for a in earned]
        assert "Helping Hand" in names


class TestAchievementAPI:
    async def test_list_achievements(self):
        from httpx import ASGITransport, AsyncClient
        from app.main import app

        transport = ASGITransport(app=app)
        client = AsyncClient(transport=transport, base_url="http://test")
        try:
            resp = await client.get("/api/v1/achievements")
            assert resp.status_code == 403  # Needs auth
        finally:
            await client.aclose()

    async def test_daily_spin_requires_child(self):
        from httpx import ASGITransport, AsyncClient
        from app.main import app

        transport = ASGITransport(app=app)
        client = AsyncClient(transport=transport, base_url="http://test")
        try:
            resp = await client.post("/api/v1/achievements/daily-spin")
            assert resp.status_code == 403
        finally:
            await client.aclose()

    async def test_mystery_chest_requires_auth(self):
        from httpx import ASGITransport, AsyncClient
        from app.main import app

        transport = ASGITransport(app=app)
        client = AsyncClient(transport=transport, base_url="http://test")
        try:
            resp = await client.post("/api/v1/achievements/mystery-chest")
            assert resp.status_code == 403
        finally:
            await client.aclose()


class TestSpinLogic:
    def test_spin_prizes_well_formed(self):
        from app.api.achievements import SPIN_PRIZES
        assert len(SPIN_PRIZES) > 0
        for prize in SPIN_PRIZES:
            assert "prize" in prize
            assert "type" in prize
            assert "value" in prize
            assert prize["type"] in ("stars", "gems", "nothing")


class TestChestLogic:
    def test_chest_rewards_well_formed(self):
        from app.api.achievements import CHEST_REWARDS
        assert "stars" in CHEST_REWARDS
        assert "gems" in CHEST_REWARDS
        assert "cosmetic" in CHEST_REWARDS
        for reward_type, pool in CHEST_REWARDS.items():
            assert len(pool) > 0
            for item in pool:
                assert "weight" in item
