"""Natural Language Task Parser — parses parent's free-form text into task template structure.

Example inputs:
  "Yossi needs to practice piano 30 min every weekday, 75 points,
   20 bonus on first ask, -10 per extra ask"

  "Shower time, 10 minutes, 50 points, daily"

  "Take out trash every Monday, 30 points, assigned to Almog"
"""

import re
from datetime import datetime


def parse_natural_language_task(text: str, child_name: str | None = None) -> dict:
    """Parse natural language text into a task template structure.

    Returns a dict with confidence score and parsed fields.
    """
    text_lower = text.lower().strip()
    confidence = 0.0
    parsed = {
        "name": "",
        "task_type": "one_shot",
        "base_points": 10,
        "timer_duration": None,
        "schedule_type": "daily",
        "schedule_days": None,
        "max_asks": 2,
        "bonus_first_ask": 0,
        "penalty_per_ask": 0,
        "assigned_to": child_name,
    }

    # ── Extract task name ──────────────────────────────────────
    # Try to find the task name — usually the first few words before keywords
    name_patterns = [
        r"^(?:need to |has to |have to |let'?s |time to )?(.+?)(?:\s+(?:every|each|daily|weekly|on|for|\d+\s*(?:min|minute|point|star)))",
        r"^(.+?)(?:\s*[,，])",
    ]

    for pattern in name_patterns:
        match = re.match(pattern, text, re.IGNORECASE)
        if match:
            parsed["name"] = match.group(1).strip().title()
            confidence += 0.2
            break

    # Fallback: use first 3-4 words
    if not parsed["name"]:
        words = text.split()
        parsed["name"] = " ".join(words[:4]).title()
        confidence += 0.1

    # ── Extract assigned child ─────────────────────────────────
    # Look for patterns like "assigned to X", "for X", or child_name at start
    assigned_match = re.search(r"(?:assigned to|for)\s+(\w+)", text_lower)
    if assigned_match:
        parsed["assigned_to"] = assigned_match.group(1).capitalize()
        confidence += 0.1
    elif child_name:
        # Check if child name appears in text
        if child_name.lower() in text_lower:
            parsed["assigned_to"] = child_name
            confidence += 0.1

    # ── Extract timer duration ──────────────────────────────────
    timer_match = re.search(r"(\d+)\s*(?:min|minute)", text_lower)
    if timer_match:
        minutes = int(timer_match.group(1))
        parsed["timer_duration"] = minutes * 60  # Convert to seconds
        parsed["task_type"] = "timed"
        confidence += 0.15

    # ── Extract points ──────────────────────────────────────────
    points_match = re.search(r"(\d+)\s*(?:point|star|⭐)", text_lower)
    if points_match:
        parsed["base_points"] = int(points_match.group(1))
        confidence += 0.15

    # ── Extract schedule ───────────────────────────────────────
    if re.search(r"\bevery\s+weekend\b", text_lower) or re.search(r"\bsat.*sun\b", text_lower):
        parsed["schedule_type"] = "weekly"
        parsed["schedule_days"] = [6, 0]  # Sat, Sun
        confidence += 0.1
    elif re.search(r"\bevery\s+week\s*day\b|\bweekdays\b", text_lower):
        parsed["schedule_type"] = "weekdays"
        parsed["schedule_days"] = [0, 1, 2, 3, 4]
        confidence += 0.1
    elif re.search(r"\b(once|one.time|just.today|single.time)\b", text_lower):
        parsed["schedule_type"] = "once"
        confidence += 0.1
    elif re.search(r"\bevery\s+day\b|\bdaily\b", text_lower):
        parsed["schedule_type"] = "daily"
        confidence += 0.1
    elif re.search(r"\bevery\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b", text_lower):
        day_map = {"monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3, "friday": 4, "saturday": 5, "sunday": 6}
        day_match = re.search(r"every\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)", text_lower)
        if day_match:
            parsed["schedule_type"] = "weekly"
            parsed["schedule_days"] = [day_map[day_match.group(1)]]
            confidence += 0.1
    elif re.search(r"\bevery\s+(mon|tue|wed|thu|fri|sat|sun)\b", text_lower):
        day_map = {"mon": 0, "tue": 1, "wed": 2, "thu": 3, "fri": 4, "sat": 5, "sun": 6}
        day_match = re.search(r"every\s+(mon|tue|wed|thu|fri|sat|sun)", text_lower)
        if day_match:
            parsed["schedule_type"] = "weekly"
            parsed["schedule_days"] = [day_map[day_match.group(1)]]
            confidence += 0.1

    # ── Extract bonus/penalty for asks ──────────────────────────
    bonus_match = re.search(r"(\d+)\s*(?:bonus|first.ask)", text_lower)
    if bonus_match:
        parsed["bonus_first_ask"] = int(bonus_match.group(1))
        confidence += 0.1

    penalty_match = re.search(r"[-−](\d+)\s*(?:per|each)?\s*(?:extra\s*)?ask", text_lower)
    if penalty_match:
        parsed["penalty_per_ask"] = int(penalty_match.group(1))
        confidence += 0.1

    # ── Detect checklist type ──────────────────────────────────
    if re.search(r"\bchecklist\b|\bsubtasks?\b|\bsteps?\b", text_lower):
        parsed["task_type"] = "checklist"
        confidence += 0.1

    # ── Detect bonus type ──────────────────────────────────────
    if re.search(r"\bbonus\s+task\b|\bextra\s+credit\b", text_lower):
        parsed["task_type"] = "bonus"
        confidence += 0.1

    # Cap confidence
    parsed["confidence"] = min(confidence, 0.98)
    return parsed