# Contributing to FunDo

Thanks for contributing! Here's how to get started.

## Development Setup

### Prerequisites

- Python 3.12+
- Node.js 22+
- Git

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # edit with your settings
PYTHONPATH=. python -m uvicorn app.main:app --reload --port 8000
```

The API will be available at http://localhost:8000/api/v1/

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will open at http://localhost:5173 and proxy API calls to port 8000.

### Full Stack (Docker)

```bash
docker compose up --build
```

## Architecture

### Backend

FunDo uses FastAPI with async SQLAlchemy. Key patterns:

- **Models**: SQLAlchemy ORM models in `backend/app/models/`
- **Schemas**: Pydantic request/response models in `backend/app/schemas/`
- **Services**: Business logic in `backend/app/services/`
- **API Routes**: FastAPI routers in `backend/app/api/`
- **Auth**: JWT tokens with bcrypt passwords (see `backend/app/core/auth.py`)
- **Database**: SQLite in dev, PostgreSQL in prod

### Frontend

React 19 + TypeScript + Vite 8:

- **Components**: Organized by role (`parent/`, `kid/`, `shared/`, `settings/`, `auth/`)
- **Lazy loading**: Wrapper components in `src/lazy/` for code splitting
- **API client**: Centralized in `src/lib/api.ts`
- **Types**: Shared TypeScript interfaces in `src/lib/types.ts`
- **i18n**: Translations in `src/locales/` using i18next
- **Auth**: JWT stored in localStorage, context in `src/contexts/AuthContext.tsx`

### Data Flow

```
User Action → React Component → api.ts → FastAPI → SQLAlchemy → SQLite
                                                              ↓
User Update ← React State ← JSON Response ← Pydantic Schema ← SQL Result
```

## Coding Conventions

### TypeScript
- Use named exports (not default) for components
- Use `type` imports for type-only imports (verbatimModuleSyntax)
- ESLint: zero warnings (`npx eslint src/ --max-warnings 0`)
- All components use functional style with hooks

### Python
- Type hints required on all function signatures
- Use Pydantic BaseModel for request/response schemas
- Use SQLAlchemy async patterns (`select().where()`)
- Follow FastAPI dependency injection pattern

### Testing

#### Backend Tests

```bash
cd backend
PYTHONPATH=. python -m pytest tests/ -v --asyncio-mode=auto
```

Tests use SQLite in-memory databases. Each test module has its own DB instance.

Guidelines:
- Test files: `tests/test_{feature}.py`
- Use `AsyncClient` for API integration tests
- Use `db` fixture for service-level tests
- One test class per endpoint/feature

#### Frontend Checks

```bash
cd frontend
npx tsc --noEmit                    # Type checking
npx eslint src/ --max-warnings 0    # Linting
npm run build                       # Production build check
```

## Git Workflow

1. Create a feature branch from `main`
2. Make changes following conventions above
3. Run backend tests (all must pass)
4. Run frontend checks (`tsc --noEmit && eslint && build`)
5. Commit with descriptive message: `"Phase X: Feature description — vX.Y.Z"`
6. Push and create a PR

## Commit Convention

```
Phase N: Short description — vX.Y.Z

Detailed bullet points of changes...
```

## Adding a New Feature

1. **Backend model**: Add to `backend/app/models/`
2. **Backend schema**: Add to `backend/app/schemas/`
3. **API route**: Add to `backend/app/api/`
4. **Register router**: Add to `backend/app/main.py`
5. **Service logic**: Add to `backend/app/services/`
6. **Frontend type**: Add interface to `frontend/src/lib/types.ts`
7. **API method**: Add to `frontend/src/lib/api.ts`
8. **Component**: Create in `frontend/src/components/`
9. **Route**: Add to `frontend/src/App.tsx`
10. **Tests**: Add to `backend/tests/test_{feature}.py`

## Adding a New Language

1. Create `frontend/src/locales/{lang_code}.json`
2. Copy structure from `en.json`
3. Translate all keys
4. Add to `SUPPORTED_LANGUAGES` in `src/lib/i18n.ts`

## Deployment

FunDo deploys via Coolify:

```bash
./deploy.sh <coolify_app_uuid>
```

Or push to main and Coolify auto-deploys (if webhook configured).

## Questions?

Open an issue or contact the maintainer.
