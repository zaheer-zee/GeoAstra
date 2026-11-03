import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_health_endpoint():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        response = await ac.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "ai-engine"
        assert data["version"] == "0.1.0"
        assert "timestamp" in data


@pytest.mark.asyncio
async def test_root_endpoint():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        response = await ac.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "online"
        assert data["service"] == "GeoAstra AI Engine"

