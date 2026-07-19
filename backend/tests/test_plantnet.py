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
