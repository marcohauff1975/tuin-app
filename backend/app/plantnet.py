from dataclasses import dataclass

import httpx

from app.config import get_settings

_ENDPOINT = "https://my-api.plantnet.org/v2/identify/all"


class PlantNetError(Exception):
    """Raised when the Pl@ntNet call or its response cannot be processed."""


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
    try:
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
    except httpx.HTTPError as exc:
        raise PlantNetError(f"Pl@ntNet request failed: {exc}") from exc
    except (KeyError, TypeError, ValueError) as exc:
        raise PlantNetError(f"Unexpected Pl@ntNet response: {exc}") from exc
    return _sort_matches(matches)


def identify(images: list[bytes]) -> list[Match]:
    settings = get_settings()
    if settings.mode == "real":
        return _real_matches(images)
    return _sort_matches(_mock_matches())
