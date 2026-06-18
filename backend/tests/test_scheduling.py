"""Tests for enhanced scheduling service."""

import pytest
from datetime import date, timedelta
from app.services.scheduling import is_scheduled_today, get_next_occurrences, get_schedule_preview


def test_daily_schedule():
    """Daily tasks should be scheduled every day."""
    from app.models.task import TaskTemplate
    tpl = TaskTemplate(schedule_type="daily")
    for i in range(7):
        d = date.today() + timedelta(days=i)
        assert is_scheduled_today(tpl, d) is True


def test_weekdays_schedule():
    """Weekday tasks should only be scheduled Mon-Fri."""
    from app.models.task import TaskTemplate
    tpl = TaskTemplate(schedule_type="weekdays")
    
    # Find a Monday to test from
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    
    for i in range(7):
        d = monday + timedelta(days=i)
        should_be = d.weekday() < 5  # Mon-Fri
        assert is_scheduled_today(tpl, d) == should_be


def test_weekly_schedule():
    """Weekly tasks with specific days."""
    from app.models.task import TaskTemplate
    tpl = TaskTemplate(schedule_type="weekly", schedule_days=[0, 2, 4])  # Mon, Wed, Fri
    
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    
    for i in range(7):
        d = monday + timedelta(days=i)
        should_be = d.weekday() in [0, 2, 4]
        assert is_scheduled_today(tpl, d) == should_be


def test_every_n_days_schedule():
    """Every N days should skip the correct days."""
    from app.models.task import TaskTemplate
    from datetime import timezone, datetime
    tpl = TaskTemplate(
        schedule_type="every_n_days",
        schedule_every_n_days=3,
        created_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
    )
    # Jan 1 is a Thursday (2026)
    # Jan 4, 7, 10, 13 etc should be scheduled
    
    test_dates = [
        (date(2026, 1, 1), True),   # creation day
        (date(2026, 1, 2), False),
        (date(2026, 1, 3), False),
        (date(2026, 1, 4), True),
        (date(2026, 1, 7), True),
        (date(2026, 1, 10), True),
    ]
    for d, expected in test_dates:
        assert is_scheduled_today(tpl, d) == expected, f"Failed for {d}"


def test_nth_weekday_schedule():
    """2nd Tuesday should be scheduled correctly."""
    from app.models.task import TaskTemplate
    tpl = TaskTemplate(
        schedule_type="nth_weekday",
        schedule_nth_weekday={"n": 2, "weekday": 1},  # 2nd Tuesday
    )
    # Jan 13, 2026 is the 2nd Tuesday of January
    assert is_scheduled_today(tpl, date(2026, 1, 13)) is True
    assert is_scheduled_today(tpl, date(2026, 1, 6)) is False  # 1st Tuesday


def test_monthly_schedule():
    """Monthly tasks on the 15th."""
    from app.models.task import TaskTemplate
    tpl = TaskTemplate(schedule_type="monthly", schedule_monthly_day=15)
    
    assert is_scheduled_today(tpl, date(2026, 1, 15)) is True
    assert is_scheduled_today(tpl, date(2026, 1, 14)) is False
    assert is_scheduled_today(tpl, date(2026, 1, 16)) is False


def test_get_next_occurrences():
    """Should return correct next occurrence dates."""
    from app.models.task import TaskTemplate
    tpl = TaskTemplate(schedule_type="weekly", schedule_days=[0, 3])  # Mon, Thu
    
    monday = date.today() - timedelta(days=date.today().weekday())
    occs = get_next_occurrences(tpl, monday, days=14)
    
    # Check all returned dates are Mon or Thu
    for occ in occs:
        assert occ.weekday() in [0, 3]


def test_schedule_preview():
    """Schedule preview should return 7 days."""
    from app.models.task import TaskTemplate
    tpl = TaskTemplate(schedule_type="weekdays")
    
    preview = get_schedule_preview(tpl)
    assert len(preview) == 7
    assert all("date" in p and "day" in p and "scheduled" in p for p in preview)


def test_custom_days_schedule():
    """Custom schedule with specific days."""
    from app.models.task import TaskTemplate
    tpl = TaskTemplate(schedule_type="custom", schedule_days=[5, 6])  # Sat, Sun
    
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    
    for i in range(7):
        d = monday + timedelta(days=i)
        should_be = d.weekday() in [5, 6]
        assert is_scheduled_today(tpl, d) == should_be
