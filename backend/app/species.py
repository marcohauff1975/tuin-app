import json
from functools import lru_cache
from pathlib import Path

_DATA_PATH = Path(__file__).parent.parent / "data" / "species.json"


@lru_cache(maxsize=1)
def _load() -> list[dict]:
    with _DATA_PATH.open(encoding="utf-8") as f:
        return json.load(f)


def list_species() -> list[dict]:
    return [dict(r) for r in _load()]


def get_schedule(scientific_name: str) -> dict | None:
    key = scientific_name.strip().lower()
    for record in _load():
        if record["scientific_name"].lower() == key:
            return dict(record)
    return None
