# Tuin-app Backend (PoC)

Photo → Pl@ntNet identification → static maintenance schedule.

## Setup
```
cd backend
uv sync
cp .env.example .env    # set PLANTNET_MODE and PLANTNET_API_KEY
```

## Run
```
uv run uvicorn app.main:app --reload
```
Open http://127.0.0.1:8000/docs for interactive API docs.

## Test
```
uv run pytest
```
Tests run in mock mode — no network or Pl@ntNet quota used.
