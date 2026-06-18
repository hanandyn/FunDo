# 🏰 QuestKids

> Gamified chore & task platform for kids ages 3–18  
> **Phase 1 MVP** — v0.1.0

## Overview

QuestKids turns everyday chores and tasks into an adventure game. Kids earn points, level up, build streaks, and redeem rewards — while parents configure tasks, set point values, and manage the reward shop.

## Features (Phase 1 MVP)

### For Parents
- 👨‍👩‍👧‍👦 Family account with parent login
- 👶 Create child profiles with age tiers (1–5)
- 📋 Create task templates (one-shot, timed, checklist, bonus)
- ⭐ Configure points, timer durations, compliance settings
- 🎁 Set up reward shop items with star/gem costs
- 📊 View family leaderboard

### For Kids
- ⚔️ Quest board showing daily tasks
- ⏱ Big animated countdown timer for timed tasks
- ⭐ Earn points with dynamic scoring (base + compliance + speed + streaks)
- 🔥 Streak tracking with freeze tokens
- 🛒 Reward shop to redeem earned stars & gems
- 🏆 Family leaderboard with bar charts
- 🎨 Colorful, playful UI with animations

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python FastAPI + SQLAlchemy (async) |
| Frontend | React + TypeScript + Vite |
| Styling | Tailwind CSS |
| Animations | Framer Motion |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Auth | JWT (bcrypt + python-jose) |
| Deploy | Docker + Coolify |

## Quick Start (Development)

### Backend

```bash
cd backend
pip install -r requirements.txt
PYTHONPATH=. python -m uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

### Docker

```bash
docker compose up --build
```

## Running Tests

```bash
# Backend tests
cd backend
PYTHONPATH=. python -m pytest tests/ -v --asyncio-mode=auto

# Frontend tests
cd frontend
npx vitest run
```

## Project Structure

```
questkids/
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI route handlers
│   │   │   ├── auth.py   # Auth endpoints
│   │   │   ├── tasks.py  # Task CRUD + completion
│   │   │   ├── rewards.py # Reward shop
│   │   │   └── leaderboard.py
│   │   ├── core/         # Config, DB, security
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic schemas
│   │   └── services/     # Business logic
│   │       ├── scoring.py    # Point calculation engine
│   │       ├── streaks.py    # Streak management
│   │       └── leaderboard.py
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/     # Login/Register
│   │   │   ├── parent/   # Parent dashboard
│   │   │   ├── kid/      # Kid quest board
│   │   │   └── timer/    # Countdown timer
│   │   ├── contexts/     # Auth context
│   │   └── lib/          # API client, types, i18n
│   └── public/
├── docker-compose.yml
└── PLAN.md               # Full system design
```

## API Endpoints (v1)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/register-parent` | Register parent + family |
| POST | `/api/v1/auth/login` | Login (parent or child) |
| POST | `/api/v1/auth/create-child` | Parent creates child |
| GET | `/api/v1/auth/me` | Get current user |
| GET | `/api/v1/auth/children` | List family children |
| POST | `/api/v1/tasks/templates` | Create task template |
| GET | `/api/v1/tasks/templates` | List task templates |
| GET | `/api/v1/tasks/instances` | List task instances |
| POST | `/api/v1/tasks/instances/{id}/start-timer` | Start timer |
| POST | `/api/v1/tasks/instances/{id}/complete` | Complete task |
| POST | `/api/v1/tasks/instances/{id}/approve` | Parent approves |
| POST | `/api/v1/rewards` | Create reward |
| GET | `/api/v1/rewards` | List rewards |
| POST | `/api/v1/rewards/{id}/redeem` | Kid redeems reward |
| GET | `/api/v1/leaderboard` | Family leaderboard |

## Scoring Formula

```
Total = (Base + Compliance Bonus - Penalty + Speed Bonus - Overstay)
      × Streak Multiplier (1.0–3.0)
      × Random Bonus (1% jackpot chance)
      × Handicap Multiplier

Compliance: +10 on 1st ask, -5 per extra ask
Speed: +2/min early, -5/min overstay
Streak: 1.0→1.2 at 3d, 1.5 at 7d, 2.5 at 30d, 3.0 at 60d
```

## What's Deferred to Phase 2+

- Avatar system & customization
- Tier 1 (ages 3–5) and Tier 4+ UIs
- Photo verification
- WebSocket real-time timer sync
- Sound effects & music
- Freeze token auto-apply
- Daily login spin & mystery chests
- Family goals & team quests
- Hebrew RTL full localization
- Native mobile apps
- AI-powered insights & tips
