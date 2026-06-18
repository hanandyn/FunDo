"""Settings API endpoints — Shabbat mode, scheduling, family settings."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from ..core.database import get_db
from ..core.auth import get_current_user
from ..models import User, Family
from ..models.task import TaskTemplate
from ..services.scheduling import get_next_occurrences as next_occ, generate_instances_for_week, get_schedule_preview
from sqlalchemy import select

router = APIRouter(prefix="/settings", tags=["settings"])


class ShabbatSettings(BaseModel):
    shabbat_mode: bool = False
    shabbat_start_time: str | None = None  # e.g. "18:30"
    shabbat_end_time: str | None = None     # e.g. "19:45"
    shabbat_auto_detect: bool = False


class ShabbatStatus(BaseModel):
    active: bool
    greeting: str | None = None
    starts_in_minutes: int | None = None
    ends_in_minutes: int | None = None


class ThemePreferences(BaseModel):
    focus_mode: bool = False
    colorblind_theme: str | None = None  # deuteranopia, protanopia, tritanopia, high_contrast
    high_contrast: bool = False
    language: str = "en"


# --- Shabbat settings ---

@router.get("/shabbat", response_model=ShabbatSettings)
async def get_shabbat_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get Shabbat settings for the family."""
    if current_user.family_id is None:
        raise HTTPException(status_code=400, detail="No family associated")
    
    result = await db.execute(select(Family).where(Family.id == current_user.family_id))
    family = result.scalar_one_or_none()
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")

    return ShabbatSettings(
        shabbat_mode=family.shabbat_mode,
        shabbat_start_time=family.shabbat_start_time,
        shabbat_end_time=family.shabbat_end_time,
        shabbat_auto_detect=family.shabbat_auto_detect,
    )


@router.put("/shabbat", response_model=ShabbatSettings)
async def update_shabbat_settings(
    settings: ShabbatSettings,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update Shabbat settings for the family. Parent only."""
    if current_user.role != "parent":
        raise HTTPException(status_code=403, detail="Only parents can update Shabbat settings")
    if current_user.family_id is None:
        raise HTTPException(status_code=400, detail="No family associated")

    result = await db.execute(select(Family).where(Family.id == current_user.family_id))
    family = result.scalar_one_or_none()
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")

    family.shabbat_mode = settings.shabbat_mode
    family.shabbat_start_time = settings.shabbat_start_time
    family.shabbat_end_time = settings.shabbat_end_time
    family.shabbat_auto_detect = settings.shabbat_auto_detect
    await db.commit()

    return await get_shabbat_settings(db, current_user)


@router.get("/shabbat/status", response_model=ShabbatStatus)
async def get_shabbat_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Check if Shabbat mode is currently active and time remaining."""
    if current_user.family_id is None:
        return ShabbatStatus(active=False)

    result = await db.execute(select(Family).where(Family.id == current_user.family_id))
    family = result.scalar_one_or_none()
    if not family or not family.shabbat_mode:
        return ShabbatStatus(active=False)

    from datetime import datetime, timezone

    now = datetime.now(timezone.utc)
    current_time_minutes = now.hour * 60 + now.minute

    def parse_time(time_str: str | None) -> int | None:
        if not time_str:
            return None
        try:
            h, m = time_str.split(":")
            return int(h) * 60 + int(m)
        except (ValueError, TypeError):
            return None

    start_min = parse_time(family.shabbat_start_time)
    end_min = parse_time(family.shabbat_end_time)

    if start_min is not None and end_min is not None:
        if start_min <= current_time_minutes < end_min:
            # Currently Shabbat
            minutes_until_end = end_min - current_time_minutes
            return ShabbatStatus(
                active=True,
                greeting="Shabbat Shalom! ✨",
                ends_in_minutes=minutes_until_end,
            )
        elif current_time_minutes < start_min:
            # Before Shabbat
            minutes_until = start_min - current_time_minutes
            return ShabbatStatus(
                active=False,
                starts_in_minutes=minutes_until,
            )

    # Auto-detect: if Friday after 18:00 or Saturday until 19:30
    if family.shabbat_auto_detect:
        if now.weekday() == 4 and now.hour >= 18:  # Friday evening
            return ShabbatStatus(active=True, greeting="Shabbat Shalom! ✨", ends_in_minutes=(24 - now.hour + 19) * 60 + 30)
        elif now.weekday() == 5:  # Saturday
            if now.hour < 19:
                return ShabbatStatus(active=True, greeting="Shabbat Shalom! ✨", ends_in_minutes=(19 - now.hour) * 60 - now.minute)
            elif now.hour == 19 and now.minute < 30:
                return ShabbatStatus(active=True, greeting="Shabbat Shalom! ✨", ends_in_minutes=30 - now.minute)

    return ShabbatStatus(active=False)


# --- Scheduling ---

class SchedulePreviewRequest(BaseModel):
    template_id: int


@router.post("/schedule/preview")
async def schedule_preview(
    req: SchedulePreviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a 7-day preview of when a task template will generate instances."""
    result = await db.execute(select(TaskTemplate).where(TaskTemplate.id == req.template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    return get_schedule_preview(template)


@router.post("/schedule/generate")
async def generate_week_instances(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate task instances for the next 7 days for all children. Parent only."""
    if current_user.role != "parent":
        raise HTTPException(status_code=403, detail="Only parents can generate instances")
    if current_user.family_id is None:
        raise HTTPException(status_code=400, detail="No family associated")

    children_result = await db.execute(
        select(User).where(User.family_id == current_user.family_id, User.role == "child")
    )
    children = children_result.scalars().all()
    children_ids = [c.id for c in children]

    instances = await generate_instances_for_week(db, current_user.family_id, children_ids)
    return {"generated": len(instances)}


# --- Theme preferences ---

@router.get("/theme", response_model=ThemePreferences)
async def get_theme_preferences(
    current_user: User = Depends(get_current_user),
):
    """Get theme preferences for the current user."""
    import json
    prefs = {}
    try:
        prefs = json.loads(current_user.theme_preference) if current_user.theme_preference else {}
    except (json.JSONDecodeError, TypeError):
        pass
    
    lang = "en"
    try:
        import i18n_mod  # type: ignore
        lang = "en"
    except ImportError:
        pass

    return ThemePreferences(
        focus_mode=prefs.get("focus_mode", False),
        colorblind_theme=prefs.get("colorblind_theme"),
        high_contrast=prefs.get("high_contrast", False),
        language=prefs.get("language", "en"),
    )


@router.put("/theme", response_model=ThemePreferences)
async def update_theme_preferences(
    prefs: ThemePreferences,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update theme preferences."""
    import json
    current_user = await db.merge(current_user)  # re-attach to session
    current_user.theme_preference = json.dumps({
        "focus_mode": prefs.focus_mode,
        "colorblind_theme": prefs.colorblind_theme,
        "high_contrast": prefs.high_contrast,
        "language": prefs.language,
    })
    await db.commit()
    return prefs
