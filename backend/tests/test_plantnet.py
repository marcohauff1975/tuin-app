import pytest

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


def test_real_mode_parses_and_sorts_response(monkeypatch):
    monkeypatch.setenv("PLANTNET_MODE", "real")
    monkeypatch.setenv("PLANTNET_API_KEY", "test-key")

    class _FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                "results": [
                    {"score": 0.1, "species": {"scientificNameWithoutAuthor": "Rosa"}},
                    {"score": 0.8, "species": {"scientificNameWithoutAuthor": "Hedera helix"}},
                ]
            }

    import app.plantnet as pn

    monkeypatch.setattr(pn.httpx, "post", lambda *a, **k: _FakeResponse())
    matches = identify([b"img-bytes"])
    assert [m.scientific_name for m in matches] == ["Hedera helix", "Rosa"]
    assert matches[0].confidence == 0.8


def test_real_mode_malformed_response_raises_plantneterror(monkeypatch):
    monkeypatch.setenv("PLANTNET_MODE", "real")
    monkeypatch.setenv("PLANTNET_API_KEY", "test-key")

    class _FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {"results": [{"score": 0.1}]}  # missing "species" key

    import app.plantnet as pn
    from app.plantnet import PlantNetError

    monkeypatch.setattr(pn.httpx, "post", lambda *a, **k: _FakeResponse())
    with pytest.raises(PlantNetError):
        identify([b"img-bytes"])
