"""Ensure the static mount does not shadow the health endpoint."""
from fastapi.testclient import TestClient
from app.main import app, APP_VERSION

def test_health_is_reachable():
    response = TestClient(app).get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "version": APP_VERSION}
