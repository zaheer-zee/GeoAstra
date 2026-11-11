import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.core.config import settings


@pytest.mark.asyncio
async def test_internal_analysis_run_endpoint():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        payload = {
            "analysis_id": "test-analysis-123",
            "area_id": "test-area-123",
            "scene_id": "test-scene-123",
            "algorithm": "rxd",
            "algorithm_configuration": {"threshold": 0.05},
        }

        # Request without header should fail 401
        res_no_auth = await ac.post("/internal/v1/analysis/run", json=payload)
        assert res_no_auth.status_code == 401

        # Request with valid internal key
        res = await ac.post(
            "/internal/v1/analysis/run",
            json=payload,
            headers={"X-Internal-API-Key": settings.INTERNAL_API_KEY},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "success"
        assert data["analysis_id"] == "test-analysis-123"
        assert "artifacts" in data
        assert "metrics" in data

