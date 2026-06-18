"""Pytest configuration and fixtures."""

import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.core.database import Base

TEST_DB = "sqlite+aiosqlite:///./test_achievements.db"


@pytest_asyncio.fixture
async def db_session():
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
    if os.path.exists(TEST_DB.replace("sqlite+aiosqlite:///", "")):
        os.unlink(TEST_DB.replace("sqlite+aiosqlite:///", ""))
