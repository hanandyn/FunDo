"""Integration tests for the API — using TestClient with async override."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.core.database import Base, get_db
from app.main import app

TEST_DATABASE_URL = "sqlite+aiosqlite://"

test_engine = create_async_engine(TEST_DATABASE_URL)
test_session = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


async def override_get_db():
    async with test_session() as session:
        try:
            yield session
        finally:
            await session.close()


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.clear()
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


def make_client() -> AsyncClient:
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


@pytest_asyncio.fixture
async def parent_token():
    """Create a parent and return a token."""
    client = make_client()
    try:
        resp = await client.post("/api/v1/auth/register-parent", json={
            "username": "parent1",
            "display_name": "Parent",
            "password": "secret123",
            "role": "parent",
        })
        data = resp.json()
        token = data["access_token"]
        return {"token": token, "user": data["user"]}
    finally:
        await client.aclose()


class TestAuth:
    async def test_register_parent(self):
        client = make_client()
        try:
            resp = await client.post("/api/v1/auth/register-parent", json={
                "username": "mom",
                "display_name": "Mom",
                "password": "secret123",
                "role": "parent",
            })
            assert resp.status_code == 200
            data = resp.json()
            assert data["user"]["username"] == "mom"
            assert data["user"]["role"] == "parent"
            assert "access_token" in data
        finally:
            await client.aclose()

    async def test_login(self):
        client = make_client()
        try:
            await client.post("/api/v1/auth/register-parent", json={
                "username": "dad",
                "display_name": "Dad",
                "password": "secret123",
                "role": "parent",
            })
            resp = await client.post("/api/v1/auth/login", json={
                "username": "dad",
                "password": "secret123",
            })
            assert resp.status_code == 200
            data = resp.json()
            assert data["user"]["username"] == "dad"
        finally:
            await client.aclose()

    async def test_login_wrong_password(self):
        client = make_client()
        try:
            await client.post("/api/v1/auth/register-parent", json={
                "username": "testp",
                "display_name": "Test",
                "password": "secret123",
                "role": "parent",
            })
            resp = await client.post("/api/v1/auth/login", json={
                "username": "testp",
                "password": "wrong",
            })
            assert resp.status_code == 401
        finally:
            await client.aclose()

    async def test_create_child(self):
        client = make_client()
        try:
            reg = await client.post("/api/v1/auth/register-parent", json={
                "username": "p2",
                "display_name": "Parent",
                "password": "secret123",
                "role": "parent",
            })
            token = reg.json()["access_token"]

            resp = await client.post("/api/v1/auth/create-child", json={
                "username": "kid1",
                "display_name": "Yossi",
                "password": "kidpass",
                "role": "child",
                "age_tier": 3,
            }, headers={"Authorization": f"Bearer {token}"})
            assert resp.status_code == 200
            assert resp.json()["age_tier"] == 3
        finally:
            await client.aclose()

    async def test_unauthorized(self):
        client = make_client()
        try:
            resp = await client.get("/api/v1/auth/me")
            assert resp.status_code == 403
        finally:
            await client.aclose()


class TestTasks:
    async def test_create_template(self):
        client = make_client()
        try:
            reg = await client.post("/api/v1/auth/register-parent", json={
                "username": "tp",
                "display_name": "TP",
                "password": "secret123",
                "role": "parent",
            })
            token = reg.json()["access_token"]
            resp = await client.post("/api/v1/tasks/templates", json={
                "name": "Shower Time",
                "task_type": "timed",
                "base_points": 50,
                "timer_duration": 600,
            }, headers={"Authorization": f"Bearer {token}"})
            assert resp.status_code == 200
            assert resp.json()["name"] == "Shower Time"
        finally:
            await client.aclose()

    async def test_complete_task_flow(self):
        client = make_client()
        try:
            # Register
            reg = await client.post("/api/v1/auth/register-parent", json={
                "username": "flowparent",
                "display_name": "Flow",
                "password": "secret123",
                "role": "parent",
            })
            token = reg.json()["access_token"]

            # Create child
            await client.post("/api/v1/auth/create-child", json={
                "username": "flowkid",
                "display_name": "Flow Kid",
                "password": "kid123",
                "role": "child",
                "age_tier": 3,
            }, headers={"Authorization": f"Bearer {token}"})

            # Create task with assignment
            await client.post("/api/v1/tasks/templates", json={
                "name": "Test Task",
                "task_type": "one_shot",
                "base_points": 100,
                "assigned_child_ids": [2],
            }, headers={"Authorization": f"Bearer {token}"})

            # Login as child
            kid_login = await client.post("/api/v1/auth/login", json={
                "username": "flowkid",
                "password": "kid123",
            })
            kid_token = kid_login.json()["access_token"]

            # Get instances
            inst = await client.get("/api/v1/tasks/instances",
                headers={"Authorization": f"Bearer {kid_token}"})
            assert inst.status_code == 200
            instances = inst.json()
            assert len(instances) == 1

            # Complete task
            inst_id = instances[0]["id"]
            complete = await client.post(
                f"/api/v1/tasks/instances/{inst_id}/complete",
                json={"task_instance_id": inst_id, "elapsed_seconds": 0},
                headers={"Authorization": f"Bearer {kid_token}"},
            )
            assert complete.status_code == 200
            completed = complete.json()
            assert completed["status"] == "completed"
            assert completed["points_earned"] >= 100
        finally:
            await client.aclose()


class TestRewards:
    async def test_reward_flow(self):
        client = make_client()
        try:
            reg = await client.post("/api/v1/auth/register-parent", json={
                "username": "rp",
                "display_name": "RP",
                "password": "secret123",
                "role": "parent",
            })
            token = reg.json()["access_token"]

            resp = await client.post("/api/v1/rewards", json={
                "name": "Screen Time",
                "cost_stars": 200,
                "requires_approval": False,
            }, headers={"Authorization": f"Bearer {token}"})
            assert resp.status_code == 200
            assert resp.json()["name"] == "Screen Time"

            # Get rewards
            rewards_resp = await client.get("/api/v1/rewards",
                headers={"Authorization": f"Bearer {token}"})
            assert len(rewards_resp.json()) == 1
        finally:
            await client.aclose()
