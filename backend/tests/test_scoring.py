"""Tests for the scoring engine."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.scoring import (
    calculate_streak_multiplier,
    calculate_compliance_bonus,
    calculate_speed_bonus,
    calculate_task_points,
    xp_for_next_level,
    calculate_level_from_xp,
    get_rank_name,
)


class TestStreakMultiplier:
    def test_no_streak(self):
        assert calculate_streak_multiplier(0) == 1.0
        assert calculate_streak_multiplier(2) == 1.0

    def test_3_day(self):
        assert calculate_streak_multiplier(3) == 1.2

    def test_7_day(self):
        assert calculate_streak_multiplier(7) == 1.5

    def test_14_day(self):
        assert calculate_streak_multiplier(14) == 1.8

    def test_30_day(self):
        assert calculate_streak_multiplier(30) == 2.5

    def test_60_day(self):
        assert calculate_streak_multiplier(60) == 3.0

    def test_100_day(self):
        assert calculate_streak_multiplier(100) == 3.0


class TestComplianceBonus:
    def test_first_ask_bonus(self):
        assert calculate_compliance_bonus(1, 10, -5, 2) == 10

    def test_within_max_asks(self):
        assert calculate_compliance_bonus(2, 10, -5, 2) == 0

    def test_penalty_extra_asks(self):
        assert calculate_compliance_bonus(3, 10, -5, 2) == -5

    def test_penalty_multiple_extra(self):
        assert calculate_compliance_bonus(4, 10, -5, 2) == -10


class TestSpeedBonus:
    def test_early_finish_bonus(self):
        # 120 seconds early = 2 minutes * 2 points = 4 bonus
        assert calculate_speed_bonus(300, 420, 2, -5) == 4  # 2 min early

    def test_early_finish_partial_minute(self):
        assert calculate_speed_bonus(350, 420, 2, -5) == 2  # 1 min early

    def test_overstay_penalty(self):
        assert calculate_speed_bonus(540, 420, 2, 5) == -10  # 2 min over

    def test_exact_time(self):
        assert calculate_speed_bonus(420, 420, 2, -5) == 0


class TestCalculateTaskPoints:
    def test_basic_completion(self):
        result = calculate_task_points(
            base_points=50,
            asks_count=1,
            max_asks=2,
            bonus_first_ask=10,
            penalty_per_ask=-5,
            streak_days=0,
            random_bonus_override=1,
        )
        assert result["base_points"] == 50
        assert result["compliance_bonus"] == 10
        assert result["total"] == 60  # 50 + 10 + no streak bonus

    def test_penalized_completion(self):
        result = calculate_task_points(
            base_points=50,
            asks_count=3,
            max_asks=2,
            bonus_first_ask=10,
            penalty_per_ask=-5,
            streak_days=0,
            random_bonus_override=1,
        )
        assert result["compliance_bonus"] == -5
        assert result["total"] == 45

    def test_timed_early_finish(self):
        result = calculate_task_points(
            base_points=50,
            asks_count=1,
            bonus_first_ask=10,
            elapsed_seconds=360,  # 6 min
            timer_duration=600,   # 10 min
            early_finish_bonus_per_min=2,
            overstay_penalty_per_min=5,
            streak_days=0,
            random_bonus_override=1,
        )
        assert result["speed_bonus"] == 8  # 4 min early * 2
        assert result["total"] >= 50 + 10 + 8  # base + compliance + speed

    def test_timed_overstay(self):
        result = calculate_task_points(
            base_points=50,
            asks_count=1,
            bonus_first_ask=10,
            elapsed_seconds=720,  # 12 min
            timer_duration=600,   # 10 min
            early_finish_bonus_per_min=2,
            overstay_penalty_per_min=5,
            streak_days=0,
            random_bonus_override=1,
        )
        assert result["overstay_penalty"] == -10  # 2 min over * 5
        assert result["total"] == 50  # 50 + 10 - 10

    def test_with_7day_streak(self):
        result = calculate_task_points(
            base_points=50,
            asks_count=1,
            bonus_first_ask=10,
            streak_days=7,
            random_bonus_override=1,  # No random bonus for testing
        )
        assert result["streak_multiplier"] == 1.5
        assert result["total"] == 90  # (50+10) * 1.5

    def test_with_handicap(self):
        result = calculate_task_points(
            base_points=50,
            asks_count=1,
            bonus_first_ask=10,
            streak_days=0,
            handicap_multiplier=150,  # 50% extra for younger kid
            random_bonus_override=1,  # No random bonus for testing
        )
        assert result["total"] == 90  # 60 * 1.5

    def test_negative_base_capped_at_zero(self):
        result = calculate_task_points(
            base_points=5,
            asks_count=5,
            max_asks=2,
            penalty_per_ask=-10,
            streak_days=0,
            random_bonus_override=1,
        )
        # compliance = -30 (3 extra * -10), base 5, total would be -25
        # but capped at 0
        assert result["total"] >= 0


class TestLevelSystem:
    def test_xp_for_next_level(self):
        assert xp_for_next_level(1) == 100
        assert xp_for_next_level(5) == 500
        assert xp_for_next_level(10) == 1000

    def test_calculate_level_from_xp(self):
        assert calculate_level_from_xp(0) == 1
        assert calculate_level_from_xp(99) == 1
        assert calculate_level_from_xp(100) == 2
        assert calculate_level_from_xp(299) == 2
        assert calculate_level_from_xp(300) == 3

    def test_get_rank_name(self):
        assert get_rank_name(1) == "Tiny Helper"
        assert get_rank_name(6) == "Rising Star"
        assert get_rank_name(11) == "Task Tamer"
        assert get_rank_name(16) == "Chore Champion"
        assert get_rank_name(31) == "Legend of the House"
        assert get_rank_name(50) == "Mythic Helper"
