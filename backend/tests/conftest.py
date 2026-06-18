"""Pytest configuration and fixtures."""

import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.core.database import Base

TEST_DB = "sqlite+aiosqlite:///./test_questkids.db"


@pytest_asyncio.fixture
async def db():
    """Create a fresh database for testing services."""
    engine = create_async_engine(TEST_DB)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with session_factory() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    # Clean up the file
    db_path = TEST_DB.replace("sqlite+aiosqlite:///", "")
    if os.path.exists(db_path):
        os.unlink(db_path)


@pytest_asyncio.fixture
async def db_session(db: AsyncSession):
    """Alias for db — legacy compatibility."""
    yield db


@pytest_asyncio.fixture
async def sample_child(db: AsyncSession):
    """Create a sample child user for testing."""
    from app.models.user import User, Family
    from app.core.security import hash_password

    family = Family(name="Test Family")
    db.add(family)
    await db.flush()

    child = User(
        username="testchild",
        display_name="Test Child",
        hashed_password=hash_password("test123"),
        role="child",
        family_id=family.id,
        age_tier=2,
        level=1,
        xp=0,
        stars=0,
        gems=0,
        current_streak=0,
    )
    db.add(child)
    await db.commit()
    await db.refresh(child)

    return {"id": child.id, "family_id": family.id}


@pytest_asyncio.fixture
async def sample_parent(db: AsyncSession):
    """Create a sample parent user for testing."""
    from app.models.user import User, Family

    family = Family(name="Test Family")
    db.add(family)
    await db.flush()

    parent = User(
        username="testparent",
        display_name="Test Parent",
        hashed_password="hashed",
        role="parent",
        family_id=family.id,
    )
    db.add(parent)
    await db.commit()
    await db.refresh(parent)

    return {"id": parent.id, "family_id": family.id}


@pytest_asyncio.fixture
async def db_async_session():
    """Legacy fixture name for api tests."""
    engine = create_async_engine(TEST_DB)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with session_factory() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    db_path = TEST_DB.replace("sqlite+aiosqlite:///", "")
    if os.path.exists(db_path):
        os.unlink(db_path)
