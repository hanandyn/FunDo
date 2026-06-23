"""Scoring engine — the core dynamic point calculation system.

Formula:
Total Points = Base Value
    + Compliance Bonus (0 to +X for going on early asks)
    - Compliance Penalty (0 to -Y for delayed compliance)
    + Speed Bonus (finish early = bonus)
    - Overstay Penalty (per minute past timer)
    × Streak Multiplier (1.0 → 3.0 based on consecutive days)
    + Random Bonus (10% chance of 2×, 2% chance of 5× "jackpot")
"""

import random
from typing import Optional


def calculate_streak_multiplier(streak_days: int) -> float:
    """Returns the streak multiplier based on consecutive days."""
    if streak_days < 3:
        return 1.0
    elif streak_days < 7:
        return 1.2
    elif streak_days < 14:
        return 1.5
    elif streak_days < 30:
        return 1.8
    elif streak_days < 60:
        return 2.5
    else:
        return 3.0


def calculate_compliance_bonus(asks_count: int, bonus_first_ask: int, penalty_per_ask: int, max_asks: int) -> int:
    """Calculate compliance bonus/penalty based on how many times parent asked."""
    bonus = 0
    if asks_count <= 1:
        bonus = bonus_first_ask  # Went on first ask
    elif asks_count > max_asks:
        extra_asks = asks_count - max_asks
        bonus = penalty_per_ask * extra_asks
    return bonus


def calculate_speed_bonus(
    elapsed_seconds: int,
    timer_duration: int,
    early_finish_bonus_per_min: int,
    overstay_penalty_per_min: int,
) -> int:
    """Calculate speed bonus for finishing early or penalty for going over."""
    remaining_seconds = timer_duration - elapsed_seconds
    if remaining_seconds > 0:
        # Finished early — bonus
        minutes_early = remaining_seconds // 60
        return minutes_early * early_finish_bonus_per_min
    elif remaining_seconds < 0:
        # Overstay — penalty (overstay_penalty_per_min is positive, e.g. 5)
        minutes_over = abs(remaining_seconds) // 60
        return -(minutes_over * abs(overstay_penalty_per_min))
    return 0


def calculate_random_bonus() -> int:
    """Variable reinforcement: small chance of bonus multiplier."""
    roll = random.random()
    if roll < 0.02:  # 2% chance
        return 5  # 5× "jackpot"
    elif roll < 0.10:  # 10% chance (cumulative)
        return 2  # 2× "lucky star"
    return 1  # No bonus


def calculate_task_points(
    base_points: int,
    asks_count: int = 1,
    max_asks: int = 2,
    bonus_first_ask: int = 0,
    penalty_per_ask: int = 0,
    elapsed_seconds: Optional[int] = None,
    timer_duration: Optional[int] = None,
    early_finish_bonus_per_min: int = 2,
    overstay_penalty_per_min: int = -5,
    streak_days: int = 0,
    handicap_multiplier: int = 100,
    random_bonus_override: Optional[int] = None,  # For testing — override random
) -> dict:
    """Calculate total points for a completed task.
    
    Returns a dict with the breakdown for transparency.
    """
    breakdown = {
        "base_points": base_points,
        "compliance_bonus": 0,
        "speed_bonus": 0,
        "overstay_penalty": 0,
        "streak_multiplier": 1.0,
        "streak_bonus": 0,
        "random_multiplier": 1,
        "random_bonus": 0,
        "handicap_multiplier": handicap_multiplier / 100.0,
        "handicap_bonus": 0,
        "total": 0,
    }

    # Compliance
    compliance = calculate_compliance_bonus(
        asks_count, bonus_first_ask, penalty_per_ask, max_asks
    )
    if compliance > 0:
        breakdown["compliance_bonus"] = compliance
    else:
        breakdown["compliance_bonus"] = compliance  # negative = penalty

    # Speed (only for timed tasks)
    if elapsed_seconds is not None and timer_duration is not None:
        speed = calculate_speed_bonus(
            elapsed_seconds, timer_duration,
            early_finish_bonus_per_min, overstay_penalty_per_min,
        )
        if speed > 0:
            breakdown["speed_bonus"] = speed
        else:
            breakdown["overstay_penalty"] = speed

    # Streak multiplier
    streak_mult = calculate_streak_multiplier(streak_days)
    breakdown["streak_multiplier"] = streak_mult

    # Random bonus
    if random_bonus_override is not None:
        random_mult = random_bonus_override
    else:
        random_mult = calculate_random_bonus()
    breakdown["random_multiplier"] = random_mult

    # Subtotal before streaks/random
    subtotal = base_points + breakdown["compliance_bonus"] + breakdown["speed_bonus"] + breakdown["overstay_penalty"]
    if subtotal < 0:
        subtotal = 0  # Can't go negative

    # Apply streak multiplier
    streaked = int(subtotal * (streak_mult - 1.0))
    breakdown["streak_bonus"] = streaked
    subtotal_with_streak = int(subtotal * streak_mult)

    # Apply random multiplier
    if random_mult > 1:
        breakdown["random_bonus"] = subtotal_with_streak * (random_mult - 1)
    total_before_handicap = subtotal_with_streak * random_mult

    # Apply handicap (for younger kids)
    handicap_factor = handicap_multiplier / 100.0
    breakdown["handicap_bonus"] = int(total_before_handicap * (handicap_factor - 1.0))
    total = int(total_before_handicap * handicap_factor)

    breakdown["total"] = max(total, 0)
    return breakdown


def xp_for_next_level(current_level: int) -> int:
    """XP needed to reach the next level."""
    return current_level * 100


def calculate_level_from_xp(total_xp: int) -> int:
    """Calculate level from total XP."""
    level = 1
    xp_needed = 100  # Level 1→2 needs 100 XP
    accumulated = 0
    while accumulated + xp_needed <= total_xp:
        accumulated += xp_needed
        level += 1
        xp_needed = level * 100
    return level


def get_rank_name(level: int) -> str:
    """Get the rank name for a given level."""
    if level <= 5:
        return "Tiny Helper"
    elif level <= 10:
        return "Rising Star"
    elif level <= 15:
        return "Task Tamer"
    elif level <= 20:
        return "Chore Champion"
    elif level <= 25:
        return "Responsibility Hero"
    elif level <= 30:
        return "Quest Master"
    elif level <= 40:
        return "Legend of the House"
    else:
        return "Mythic Helper"
