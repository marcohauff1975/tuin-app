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

## API endpoints

- `POST /identify` — upload one or more photos (multipart field `files`) → recognized species, confidence, and maintenance schedule (or `in_database: false` when the species isn't one of the supported ones, `recognized: false` when nothing matches).
- `GET /species` — list all supported species.
- `GET /health` — healthcheck.

## Manual verification (2026-07-19)

End-to-end verified against the real Pl@ntNet API (`PLANTNET_MODE=real`):

- Direct API round-trip returned HTTP 200 with a valid `results[]` payload; the client parses `results[].species.scientificNameWithoutAuthor` and `results[].score` as expected.
- `POST /identify` through the running backend returned a well-formed response — e.g. best match `Solanum melongena` with `in_database: false` and `schedule: null`, correctly exercising the "recognized but not in the database" branch.
- The mock test suite (10 tests) stays green with a real-mode `.env` present, confirming tests never touch the network.
