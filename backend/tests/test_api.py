from pathlib import Path

_SAMPLE = Path(__file__).parent / "fixtures" / "sample.jpg"


def test_health_returns_ok(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


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


def test_identify_returns_502_on_service_error(client, monkeypatch):
    from app.plantnet import PlantNetError

    def _boom(images):
        raise PlantNetError("service down")

    monkeypatch.setattr("app.main.identify", _boom)
    with _SAMPLE.open("rb") as f:
        response = client.post("/identify", files={"files": ("sample.jpg", f, "image/jpeg")})
    assert response.status_code == 502
