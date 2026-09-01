# SecStorage — Developer Setup & Workflow Documentation

This directory provides developer guides, setup scripts, and contribution standards for local development.

## Developer Quickstart

```bash
# 1. Clone repository
git clone https://github.com/your-org/secstorage.git
cd secstorage

# 2. Copy environment template
cp .env.example .env

# 3. Setup Backend
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -e .
uvicorn app.main:app --reload

# 4. Setup Frontend (in separate terminal)
cd frontend
npm install
npm run dev
```

## Testing & Quality Commands

```bash
# Backend Linting & Tests
cd backend
ruff check .
pytest

# Frontend Linting & Tests
cd frontend
npm run lint
npm run typecheck
npm run test
```
