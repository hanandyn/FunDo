"""Weekly Recap and Insights API routes."""

from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_db
from ..core.auth import get_current_user, get_current_parent
from ..models.user import User
from ..schemas.social import WeeklyRecapResponse, InsightsResponse, TipCard
from ..services.weekly_recap import generate_weekly_recap, generate_kid_recap
from ..services.tips_engine import generate_tips
from ..services.leaderboard import get_family_stats_snapshot
from ..services.daily_recap import generate_kid_daily_recap, generate_parent_daily_recap
from ..services.streak_alerts import check_streak_risk, check_golden_opportunity, check_milestones
from ..services.chore_balance import analyze_chore_load
from ..services.nlp_task_parser import parse_natural_language_task

router = APIRouter(tags=["recap"])


@router.get("/recap/weekly", response_model=WeeklyRecapResponse)
async def get_weekly_recap(
    recap_date: date | None = Query(None, description="Date within the week to recap"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get weekly family recap with per-child stats and highlights."""
    if not current_user.family_id:
        raise HTTPException(status_code=400, detail="No family assigned")

    recap_data = await generate_weekly_recap(db, current_user.family_id, recap_date)
    return WeeklyRecapResponse(**recap_data)


@router.get("/recap/weekly/kid")
async def get_kid_weekly_recap(
    recap_date: date | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get simplified kid-friendly weekly recap."""
    if current_user.role != "child":
        raise HTTPException(status_code=403, detail="Only children can view kid recap")

    recap_data = await generate_kid_recap(db, current_user.id, recap_date)
    return recap_data


@router.get("/insights/tips", response_model=list[TipCard])
async def get_insights_tips(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get AI-style smart tips based on family data patterns."""
    if current_user.role != "parent":
        raise HTTPException(status_code=403, detail="Only parents can view tips")
    if not current_user.family_id:
        raise HTTPException(status_code=400, detail="No family assigned")

    tips = await generate_tips(db, current_user.family_id)
    return [TipCard(**t) for t in tips]


@router.get("/insights/analytics")
async def get_insights_analytics(
    days: int = Query(30, ge=7, le=365),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get analytics data for the parent insights dashboard."""
    if current_user.role != "parent":
        raise HTTPException(status_code=403, detail="Only parents can view analytics")
    if not current_user.family_id:
        raise HTTPException(status_code=400, detail="No family assigned")

    end_date = date.today()
    start_date = end_date - timedelta(days=days)

    stats = await get_family_stats_snapshot(db, current_user.family_id, start_date, end_date)
    tips = await generate_tips(db, current_user.family_id)

    return InsightsResponse(
        tips=[TipCard(**t) for t in tips],
        stats=stats,
    )


# ── Daily Recap ──────────────────────────────────────────────────────

@router.get("/recap/daily/kid")
async def get_kid_daily_recap(
    recap_date: date | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get kid's daily recap — evening summary of today's achievements."""
    if current_user.role != "child":
        raise HTTPException(status_code=403, detail="Only children can view kid recap")
    recap = await generate_kid_daily_recap(db, current_user.id, recap_date)
    return recap


@router.get("/recap/daily/family")
async def get_family_daily_recap(
    recap_date: date | None = Query(None),
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """Get parent's daily family recap — all kids summarized."""
    if not current_user.family_id:
        raise HTTPException(status_code=400, detail="No family assigned")
    recap = await generate_parent_daily_recap(db, current_user.family_id, recap_date)
    return recap


# ── Streak & Proactive Alerts ────────────────────────────────────────

@router.get("/alerts/streak-risk")
async def get_streak_risk_alerts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Check if any kid's streak is at risk today (hasn't done tasks at usual time)."""
    if not current_user.family_id:
        raise HTTPException(status_code=400, detail="No family assigned")
    alerts = await check_streak_risk(db, current_user.family_id)
    return {"alerts": alerts}


@router.get("/alerts/golden-opportunity")
async def get_golden_opportunity(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Check if family has a 'golden opportunity' (all done early)."""
    if not current_user.family_id:
        raise HTTPException(status_code=400, detail="No family assigned")
    opportunity = await check_golden_opportunity(db, current_user.family_id)
    return opportunity


@router.get("/alerts/milestones")
async def get_milestone_alerts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get upcoming milestone alerts for the current user."""
    if current_user.role != "child":
        raise HTTPException(status_code=403, detail="Only children have milestones")
    milestones = await check_milestones(db, current_user.id)
    return {"milestones": milestones}


# ── Chore Load Balancing ─────────────────────────────────────────────

@router.get("/insights/chore-balance")
async def get_chore_balance(
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """Analyze task distribution among siblings and suggest rebalancing."""
    if not current_user.family_id:
        raise HTTPException(status_code=400, detail="No family assigned")
    analysis = await analyze_chore_load(db, current_user.family_id)
    return analysis


# ── Natural Language Task Creation ───────────────────────────────────

class NLTaskRequest(BaseModel):
    text: str
    child_name: str | None = None


class NLTaskResponse(BaseModel):
    parsed: dict | None = None
    confidence: float = 0.0
    needs_confirmation: bool = True
    message: str = ""


@router.post("/tasks/parse-nl", response_model=NLTaskResponse)
async def parse_nl_task(
    req: NLTaskRequest,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """Parse natural language text into a task template structure.

    Example: 'Yossi needs to practice piano 30 min every weekday, 75 points,
    20 bonus on first ask, -10 per extra ask'
    """
    if not current_user.family_id:
        raise HTTPException(status_code=400, detail="No family assigned")

    parsed = parse_natural_language_task(req.text, req.child_name)
    confidence = parsed.get("confidence", 0.0)

    return NLTaskResponse(
        parsed=parsed,
        confidence=confidence,
        needs_confirmation=confidence < 0.95,
        message="Does this look right?" if confidence < 0.95 else "Ready to create!",
    )
