# Tuin-app Backend PoC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working Proof of Concept backend that accepts plant photos, identifies the species via Pl@ntNet, and returns a static maintenance schedule for supported species.

**Architecture:** A FastAPI HTTP service with three isolated units — a Pl@ntNet client (real + mock modes), a species matcher backed by a JSON data file, and an API layer that wires them together. No database, no auth, no video — photos in, schedule out.

**Tech Stack:** Python 3.12+, FastAPI, uvicorn, httpx (Pl@ntNet calls), pydantic-settings (config), pytest, ruff, uv.

## Global Constraints

- Python version floor: **3.12**.
- All Python backend code lives under `backend/` (top-level `frontend/` is reserved for Bernard's UI — never write there).
- Dependency & venv management: **uv**. Lint/format: **ruff**. Tests: **pytest**.
- Pl@ntNet real endpoint: `https://my-api.plantnet.org/v2/identify/all`. API key and mode come from environment (`PLANTNET_API_KEY`, `PLANTNET_MODE`), loaded from `backend/.env` which is gitignored — never commit the key.
- Tests must run fully in `PLANTNET_MODE=mock`: no network, no quota use.
- Commit frequently (every task) and push to `origin/main` after each task so Bernard always has the latest.
- Species matching key is the Pl@ntNet `scientific_name`.

---

## File Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── config.py          # env-based settings (mode, api key)
│   ├── plantnet.py        # Pl@ntNet client: real + mock
│   ├── species.py         # load species data, match name -> schedule
│   ├── models.py          # pydantic response models
│   └── main.py            # FastAPI app + endpoints
├── data/
│   └── species.json       # ~10 species with maintenance rules
├── tests/
│   ├── __init__.py
│   ├── conftest.py        # shared fixtures (mock mode, test client)
│   ├── fixtures/
│   │   └── sample.jpg     # tiny image for upload tests
│   ├── test_species.py
│   ├── test_plantnet.py
│   └── test_api.py
├── pyproject.toml
├── .env.example
└── README.md
```

Top-level `frontend/README.md` is also created (placeholder for Bernard).

---

### Task 1: Project scaffold (uv + FastAPI + ruff)

Set up the `backend/` package so a trivial FastAPI app boots and its healthcheck test passes. Folds in all tooling config.

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/app/__init__.py` (empty)
- Create: `backend/app/main.py`
- Create: `backend/tests/__init__.py` (empty)
- Create: `backend/tests/conftest.py`
- Create: `backend/tests/test_api.py`
- Create: `backend/.env.example`
- Create: `backend/README.md`
- Create: `frontend/README.md`
- Modify: `.gitignore` (add `backend/.env`, `.venv`, `__pycache__` already present)

**Interfaces:**
- Consumes: nothing (first task).
- Produces: FastAPI `app` object in `backend/app/main.py`; `client` pytest fixture in `conftest.py` returning `fastapi.testclient.TestClient(app)`.

- [ ] **Step 1: Create `backend/pyproject.toml`**

```toml
[project]
name = "tuin-app-backend"
version = "0.1.0"
description = "Tuin-app backend PoC: photo -> Pl@ntNet -> maintenance schedule"
requires-python = ">=3.12"
dependencies = [
    "fastapi>=0.115",
    "uvicorn[standard]>=0.30",
    "httpx>=0.27",
    "pydantic-settings>=2.4",
    "python-multipart>=0.0.9",
]

[dependency-groups]
dev = [
    "pytest>=8.3",
    "ruff>=0.6",
]

[tool.ruff]
line-length = 100
target-version = "py312"

[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B"]

[tool.pytest.ini_options]
testpaths = ["tests"]
```

- [ ] **Step 2: Create `frontend/README.md` and `backend/.env.example`**

`frontend/README.md`:
```markdown
# Frontend

Reserved for the Tuin-app UI (Bernard). Backend lives in `../backend/`.
```

`backend/.env.example`:
```
# Copy to .env and fill in. .env is gitignored.
PLANTNET_MODE=mock          # mock | real
PLANTNET_API_KEY=           # required when PLANTNET_MODE=real
```

- [ ] **Step 3: Write the failing healthcheck test**

Create `backend/tests/conftest.py`:
```python
import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)
```

Create `backend/tests/test_api.py`:
```python
def test_health_returns_ok(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

- [ ] **Step 4: Run test to verify it fails**

Run: `cd backend && uv run pytest tests/test_api.py::test_health_returns_ok -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.main'` (main.py not created yet).

- [ ] **Step 5: Write minimal `backend/app/main.py`**

```python
from fastapi import FastAPI

app = FastAPI(title="Tuin-app Backend PoC")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
```

Also create empty `backend/app/__init__.py` and `backend/tests/__init__.py`.

- [ ] **Step 6: Run test to verify it passes**

Run: `cd backend && uv run pytest tests/test_api.py::test_health_returns_ok -v`
Expected: PASS.

- [ ] **Step 7: Create `backend/README.md`**

```markdown
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
```

- [ ] **Step 8: Verify lint and full suite pass**

Run: `cd backend && uv run ruff check . && uv run pytest -v`
Expected: ruff clean; all tests PASS.

- [ ] **Step 9: Commit and push**

```bash
git add backend frontend .gitignore
git commit -m "feat(backend): scaffold FastAPI PoC with healthcheck"
git push origin main
```

---

### Task 2: Species data + matcher

Load the species data file and match a scientific name to its maintenance schedule.

**Files:**
- Create: `backend/data/species.json`
- Create: `backend/app/species.py`
- Create: `backend/tests/test_species.py`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces:
  - `list_species() -> list[dict]` — returns all species records.
  - `get_schedule(scientific_name: str) -> dict | None` — returns the species record for an exact (case-insensitive) `scientific_name` match, or `None` if unsupported.
  - Each species record dict has keys: `scientific_name` (str), `common_name_nl` (str), `pruning_month` (str), `fertilizing` (dict[str, str]), `watering` (str).

- [ ] **Step 1: Create `backend/data/species.json`** with 10 common NL garden species

```json
[
  {
    "scientific_name": "Lavandula angustifolia",
    "common_name_nl": "Lavendel",
    "pruning_month": "maart",
    "fertilizing": { "lente": "eenmalig organisch", "zomer": "niet nodig" },
    "watering": "matig, 1x per week bij droogte"
  },
  {
    "scientific_name": "Hydrangea macrophylla",
    "common_name_nl": "Hortensia",
    "pruning_month": "maart",
    "fertilizing": { "lente": "organisch", "zomer": "kalium-rijk" },
    "watering": "veel, grond vochtig houden"
  },
  {
    "scientific_name": "Rosa",
    "common_name_nl": "Roos",
    "pruning_month": "maart",
    "fertilizing": { "lente": "rozenmest", "zomer": "herhaal na eerste bloei" },
    "watering": "regelmatig, aan de voet"
  },
  {
    "scientific_name": "Buxus sempervirens",
    "common_name_nl": "Buxus",
    "pruning_month": "mei",
    "fertilizing": { "lente": "stikstofrijk", "zomer": "eenmalig" },
    "watering": "matig, niet laten uitdrogen"
  },
  {
    "scientific_name": "Hedera helix",
    "common_name_nl": "Klimop",
    "pruning_month": "april",
    "fertilizing": { "lente": "universeel", "zomer": "niet nodig" },
    "watering": "weinig, droogtetolerant"
  },
  {
    "scientific_name": "Acer palmatum",
    "common_name_nl": "Japanse esdoorn",
    "pruning_month": "november",
    "fertilizing": { "lente": "langzaamwerkend", "zomer": "niet nodig" },
    "watering": "regelmatig, geen natte voeten"
  },
  {
    "scientific_name": "Wisteria sinensis",
    "common_name_nl": "Blauweregen",
    "pruning_month": "februari",
    "fertilizing": { "lente": "kaliumrijk", "zomer": "fosforrijk" },
    "watering": "regelmatig tijdens groei"
  },
  {
    "scientific_name": "Clematis",
    "common_name_nl": "Bosrank",
    "pruning_month": "februari",
    "fertilizing": { "lente": "organisch", "zomer": "kaliumrijk" },
    "watering": "veel, voet in de schaduw"
  },
  {
    "scientific_name": "Taxus baccata",
    "common_name_nl": "Taxus",
    "pruning_month": "juni",
    "fertilizing": { "lente": "organisch", "zomer": "niet nodig" },
    "watering": "matig, goed drainerend"
  },
  {
    "scientific_name": "Prunus laurocerasus",
    "common_name_nl": "Laurierkers",
    "pruning_month": "mei",
    "fertilizing": { "lente": "stikstofrijk", "zomer": "eenmalig" },
    "watering": "regelmatig eerste jaar, daarna weinig"
  }
]
```

- [ ] **Step 2: Write the failing tests**

Create `backend/tests/test_species.py`:
```python
from app.species import get_schedule, list_species


def test_list_species_returns_all_ten():
    species = list_species()
    assert len(species) == 10
    assert all("scientific_name" in s for s in species)


def test_get_schedule_known_species():
    schedule = get_schedule("Lavandula angustifolia")
    assert schedule is not None
    assert schedule["common_name_nl"] == "Lavendel"
    assert schedule["pruning_month"] == "maart"


def test_get_schedule_is_case_insensitive():
    assert get_schedule("lavandula angustifolia") is not None


def test_get_schedule_unknown_species_returns_none():
    assert get_schedule("Triffidus celestis") is None
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd backend && uv run pytest tests/test_species.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.species'`.

- [ ] **Step 4: Write `backend/app/species.py`**

```python
import json
from functools import lru_cache
from pathlib import Path

_DATA_PATH = Path(__file__).parent.parent / "data" / "species.json"


@lru_cache(maxsize=1)
def _load() -> list[dict]:
    with _DATA_PATH.open(encoding="utf-8") as f:
        return json.load(f)


def list_species() -> list[dict]:
    return _load()


def get_schedule(scientific_name: str) -> dict | None:
    key = scientific_name.strip().lower()
    for record in _load():
        if record["scientific_name"].lower() == key:
            return record
    return None
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && uv run pytest tests/test_species.py -v`
Expected: PASS (all 4).

- [ ] **Step 6: Commit and push**

```bash
git add backend/data/species.json backend/app/species.py backend/tests/test_species.py
git commit -m "feat(backend): species data and matcher"
git push origin main
```

---

### Task 3: Config + Pl@ntNet client (mock + real)

Provide env-driven settings and a Pl@ntNet client whose mock mode needs no network, and whose real mode calls the API via httpx.

**Files:**
- Create: `backend/app/config.py`
- Create: `backend/app/plantnet.py`
- Create: `backend/tests/test_plantnet.py`
- Create: `backend/tests/fixtures/sample.jpg`
- Modify: `backend/tests/conftest.py` (force mock mode for the test session)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces:
  - `Settings` (pydantic-settings) with fields `plantnet_mode: str = "mock"` and `plantnet_api_key: str = ""`, and `get_settings() -> Settings`.
  - `identify(images: list[bytes]) -> list[Match]` where `Match` is a dataclass with `scientific_name: str` and `confidence: float`. Results sorted by `confidence` descending. In mock mode returns a fixed match `Lavandula angustifolia` @ 0.92. In real mode POSTs the images to the Pl@ntNet endpoint and parses `results[].species.scientificNameWithoutAuthor` and `results[].score`.

- [ ] **Step 1: Write `backend/app/config.py`**

```python
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="PLANTNET_", extra="ignore")

    mode: str = "mock"
    api_key: str = ""


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
```

- [ ] **Step 2: Make tests default to mock mode**

Append to `backend/tests/conftest.py`:
```python
import os

os.environ.setdefault("PLANTNET_MODE", "mock")
```
(Place these two lines at the very top of the file, before the `from app.main import app` import, so settings pick up mock mode.)

- [ ] **Step 3: Create a tiny image fixture**

Run (creates a minimal valid JPEG):
```bash
cd backend && python -c "from PIL import Image; Image.new('RGB',(4,4),'green').save('tests/fixtures/sample.jpg')" 2>/dev/null || printf '\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xff\xd9' > tests/fixtures/sample.jpg
```
(The fallback writes a minimal JPEG header/trailer — Pl@ntNet is never called in mock mode, so byte content only needs to be non-empty.)

- [ ] **Step 4: Write the failing mock-mode test**

Create `backend/tests/test_plantnet.py`:
```python
from app.plantnet import Match, identify


def test_mock_identify_returns_fixed_match(monkeypatch):
    monkeypatch.setenv("PLANTNET_MODE", "mock")
    from app.config import get_settings

    get_settings.cache_clear()
    matches = identify([b"fake-image-bytes"])
    assert isinstance(matches[0], Match)
    assert matches[0].scientific_name == "Lavandula angustifolia"
    assert matches[0].confidence == 0.92


def test_matches_are_sorted_by_confidence_desc():
    from app.plantnet import _sort_matches

    unsorted = [Match("A", 0.1), Match("B", 0.9), Match("C", 0.5)]
    result = _sort_matches(unsorted)
    assert [m.scientific_name for m in result] == ["B", "C", "A"]
```

- [ ] **Step 5: Run tests to verify they fail**

Run: `cd backend && uv run pytest tests/test_plantnet.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.plantnet'`.

- [ ] **Step 6: Write `backend/app/plantnet.py`**

```python
from dataclasses import dataclass

import httpx

from app.config import get_settings

_ENDPOINT = "https://my-api.plantnet.org/v2/identify/all"


@dataclass
class Match:
    scientific_name: str
    confidence: float


def _sort_matches(matches: list[Match]) -> list[Match]:
    return sorted(matches, key=lambda m: m.confidence, reverse=True)


def _mock_matches() -> list[Match]:
    return [Match("Lavandula angustifolia", 0.92)]


def _real_matches(images: list[bytes]) -> list[Match]:
    settings = get_settings()
    if not settings.api_key:
        raise RuntimeError("PLANTNET_API_KEY is required when PLANTNET_MODE=real")
    files = [("images", (f"image{i}.jpg", img, "image/jpeg")) for i, img in enumerate(images)]
    response = httpx.post(
        _ENDPOINT, params={"api-key": settings.api_key}, files=files, timeout=30.0
    )
    response.raise_for_status()
    payload = response.json()
    matches = [
        Match(
            scientific_name=r["species"]["scientificNameWithoutAuthor"],
            confidence=float(r["score"]),
        )
        for r in payload.get("results", [])
    ]
    return _sort_matches(matches)


def identify(images: list[bytes]) -> list[Match]:
    settings = get_settings()
    if settings.mode == "real":
        return _real_matches(images)
    return _sort_matches(_mock_matches())
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd backend && uv run pytest tests/test_plantnet.py -v`
Expected: PASS (both).

- [ ] **Step 8: Commit and push**

```bash
git add backend/app/config.py backend/app/plantnet.py backend/tests/test_plantnet.py backend/tests/conftest.py backend/tests/fixtures/sample.jpg
git commit -m "feat(backend): config and Pl@ntNet client with mock and real modes"
git push origin main
```

---

### Task 4: `/identify` and `/species` endpoints

Wire the client and matcher into the API with typed responses.

**Files:**
- Create: `backend/app/models.py`
- Modify: `backend/app/main.py` (add endpoints)
- Modify: `backend/tests/test_api.py` (add endpoint tests)

**Interfaces:**
- Consumes: `identify()` and `Match` from `app.plantnet`; `get_schedule()` and `list_species()` from `app.species`.
- Produces: HTTP endpoints `POST /identify` (multipart file uploads under field name `files`) and `GET /species`.

- [ ] **Step 1: Write `backend/app/models.py`**

```python
from pydantic import BaseModel


class BestMatch(BaseModel):
    scientific_name: str
    confidence: float


class Schedule(BaseModel):
    common_name_nl: str
    pruning_month: str
    fertilizing: dict[str, str]
    watering: str


class IdentifyResponse(BaseModel):
    recognized: bool
    best_match: BestMatch | None = None
    in_database: bool = False
    schedule: Schedule | None = None
```

- [ ] **Step 2: Write the failing endpoint tests**

Append to `backend/tests/test_api.py`:
```python
from pathlib import Path

_SAMPLE = Path(__file__).parent / "fixtures" / "sample.jpg"


def test_species_endpoint_lists_ten(client):
    response = client.get("/species")
    assert response.status_code == 200
    assert len(response.json()) == 10


def test_identify_returns_schedule_for_mock_match(client):
    with _SAMPLE.open("rb") as f:
        response = client.post("/identify", files={"files": ("sample.jpg", f, "image/jpeg")})
    assert response.status_code == 200
    body = response.json()
    assert body["recognized"] is True
    assert body["best_match"]["scientific_name"] == "Lavandula angustifolia"
    assert body["in_database"] is True
    assert body["schedule"]["common_name_nl"] == "Lavendel"


def test_identify_requires_a_file(client):
    response = client.post("/identify")
    assert response.status_code == 422
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd backend && uv run pytest tests/test_api.py -v`
Expected: FAIL — `/species` and `/identify` return 404 (not yet defined).

- [ ] **Step 4: Add endpoints to `backend/app/main.py`**

Replace the file contents with:
```python
from fastapi import FastAPI, File, UploadFile

from app.models import BestMatch, IdentifyResponse, Schedule
from app.plantnet import identify
from app.species import get_schedule, list_species

app = FastAPI(title="Tuin-app Backend PoC")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/species")
def species() -> list[dict]:
    return list_species()


@app.post("/identify", response_model=IdentifyResponse)
async def identify_endpoint(files: list[UploadFile] = File(...)) -> IdentifyResponse:
    images = [await f.read() for f in files]
    matches = identify(images)
    if not matches:
        return IdentifyResponse(recognized=False)

    best = matches[0]
    record = get_schedule(best.scientific_name)
    return IdentifyResponse(
        recognized=True,
        best_match=BestMatch(scientific_name=best.scientific_name, confidence=best.confidence),
        in_database=record is not None,
        schedule=Schedule(**{k: record[k] for k in Schedule.model_fields}) if record else None,
    )
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && uv run pytest tests/test_api.py -v`
Expected: PASS (all 4 in the file).

- [ ] **Step 6: Run the full suite and lint**

Run: `cd backend && uv run ruff check . && uv run pytest -v`
Expected: ruff clean; all tests PASS.

- [ ] **Step 7: Commit and push**

```bash
git add backend/app/models.py backend/app/main.py backend/tests/test_api.py
git commit -m "feat(backend): /identify and /species endpoints"
git push origin main
```

---

### Task 5: End-to-end manual verification with real Pl@ntNet

Confirm the PoC works against the real Pl@ntNet API using the test key, and document it. No new production code — a verification gate plus doc update.

**Files:**
- Modify: `backend/README.md` (add a "Manual verification" section)

**Interfaces:**
- Consumes: the running app; the real Pl@ntNet API.
- Produces: documented evidence the end-to-end flow works.

- [ ] **Step 1: Create local `.env` (not committed)**

```bash
cd backend && cp .env.example .env
```
Edit `.env`: set `PLANTNET_MODE=real` and `PLANTNET_API_KEY=<your test key>` (the Pl@ntNet test key you created at https://my.plantnet.org/ — kept only in the local, gitignored `.env`, never committed).
Confirm `.env` is gitignored: `git check-ignore backend/.env` must print the path.

- [ ] **Step 2: Start the server**

Run: `cd backend && uv run uvicorn app.main:app --port 8000`
Expected: server boots, no errors.

- [ ] **Step 3: Call `/identify` with a real plant photo**

Use any real plant photo saved as `~/plant.jpg`, then:
```bash
curl -s -X POST http://127.0.0.1:8000/identify -F "files=@$HOME/plant.jpg" | python -m json.tool
```
Expected: JSON with `recognized: true` and a plausible `best_match.scientific_name` with a `confidence` between 0 and 1. `in_database`/`schedule` will be populated only if the species is one of the 10 supported ones.

- [ ] **Step 4: Confirm mock suite still green**

Run: `cd backend && PLANTNET_MODE=mock uv run pytest -v`
Expected: all tests PASS (mock mode unaffected by the real-mode `.env`).

- [ ] **Step 5: Document the result and commit**

Add to `backend/README.md` a short "Manual verification (2026-07-19)" note recording that the real Pl@ntNet call returned a valid identification.
```bash
git add backend/README.md
git commit -m "docs(backend): record end-to-end Pl@ntNet verification"
git push origin main
```

---

## Self-Review

**Spec coverage:**
- Photo upload → Task 4 (`POST /identify`, multipart). ✓
- Real Pl@ntNet + mock fallback → Task 3 (`identify`, both modes), verified in Task 5. ✓
- Static rules per species (~10) → Task 2 (`species.json`, matcher). ✓
- API with `/identify`, `/species`, `/health` + Swagger → Tasks 1 & 4 (FastAPI gives `/docs` free). ✓
- Response shape (`recognized`/`best_match`/`in_database`/`schedule`) → Task 4 (`models.py`, mirrors spec). ✓
- Tooling uv/ruff/pytest, mock tests without network → Tasks 1 & 3. ✓
- `.env` for key, gitignored → Tasks 1, 3, 5. ✓
- `backend/` structure + `frontend/` placeholder → Task 1. ✓
- Deferred items (db, auth, video, notifications, weather, calendar dates) → not in any task, correct. ✓

**Placeholder scan:** No TBD/TODO; every code step has full code. ✓

**Type consistency:** `Match(scientific_name, confidence)` used identically in Tasks 3 & 4; `get_schedule`/`list_species` signatures match between Tasks 2 & 4; `Schedule` fields match `species.json` keys. ✓
