"""Authentication API routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..core.database import get_db
from ..core.security import hash_password, verify_password, create_access_token
from ..core.auth import get_current_user, get_current_parent
from ..models.user import User, Family
from ..schemas.user import (
    UserCreate, UserLogin, UserResponse, TokenResponse,
    FamilyCreate, FamilyResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register-parent", response_model=TokenResponse)
async def register_parent(
    data: UserCreate,
    db: AsyncSession = Depends(get_db),
):
    """Register a new parent user with their family."""
    # Check existing username
    result = await db.execute(select(User).where(User.username == data.username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already taken")

    # Create family
    family = Family(name=f"{data.display_name}'s Family")
    db.add(family)
    await db.flush()

    # Create parent user
    user = User(
        username=data.username,
        email=data.email,
        display_name=data.display_name,
        hashed_password=hash_password(data.password),
        role="parent",
        family_id=family.id,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token(data={"sub": str(user.id), "role": user.role})
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.post("/login", response_model=TokenResponse)
async def login(
    data: UserLogin,
    db: AsyncSession = Depends(get_db),
):
    """Login for any user (parent or child)."""
    result = await db.execute(select(User).where(User.username == data.username))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_access_token(data={"sub": str(user.id), "role": user.role})
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.post("/create-child", response_model=UserResponse)
async def create_child(
    data: UserCreate,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """Parent creates a child profile."""
    if data.role != "child":
        raise HTTPException(status_code=400, detail="Role must be 'child'")
    if not data.age_tier or data.age_tier < 1 or data.age_tier > 5:
        raise HTTPException(status_code=400, detail="Valid age_tier (1-5) required")

    result = await db.execute(select(User).where(User.username == data.username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already taken")

    child = User(
        username=data.username,
        display_name=data.display_name,
        hashed_password=hash_password(data.password),
        role="child",
        family_id=current_user.family_id,
        age_tier=data.age_tier,
    )
    db.add(child)
    await db.commit()
    await db.refresh(child)

    return UserResponse.model_validate(child)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user profile."""
    return UserResponse.model_validate(current_user)


@router.get("/family", response_model=FamilyResponse)
async def get_family(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current user's family info."""
    result = await db.execute(select(Family).where(Family.id == current_user.family_id))
    family = result.scalar_one_or_none()
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")
    return FamilyResponse.model_validate(family)


@router.get("/children", response_model=list[UserResponse])
async def get_children(
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """Get all children in the family."""
    result = await db.execute(
        select(User).where(
            User.family_id == current_user.family_id,
            User.role == "child",
        )
    )
    children = result.scalars().all()
    return [UserResponse.model_validate(c) for c in children]
