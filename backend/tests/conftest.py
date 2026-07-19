import os

os.environ.setdefault("PLANTNET_MODE", "mock")

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)
