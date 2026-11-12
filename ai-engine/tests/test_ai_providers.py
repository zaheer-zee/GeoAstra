import pytest
from httpx import ASGITransport, AsyncClient
from unittest.mock import patch, AsyncMock

from app.main import app
from app.core.config import settings
from app.providers.schemas import (
    OrchestrationRequest,
    ProviderTask,
    ProviderStatus,
    ProviderResult,
)
from app.providers.orchestrator import orchestrator, ScientificRuleSynthesizer
from app.providers.nvidia_provider import NvidiaNimProvider
from app.providers.huggingface_provider import HuggingFaceProvider


@pytest.fixture
def sample_orchestration_request():
    return OrchestrationRequest(
        analysis_id="test_analysis_789",
        algorithm="rxd",
        task=ProviderTask.ANALYSIS_EXPLANATION,
        metrics={
            "input_bands": 200,
            "processed_bands": 196,
            "bad_bands_removed": 4,
            "pixel_count": 21025,
            "width": 145,
            "height": 145,
            "detected_features_count": 14,
            "evaluation": {"auc": 0.9421},
        },
        dataset={
            "dataset_name": "Indian_pines",
            "source": "mat_file",
        },
    )


@pytest.mark.asyncio
async def test_scientific_rule_synthesizer(sample_orchestration_request):
    synthesizer = ScientificRuleSynthesizer()
    assert synthesizer.is_configured() is True

    result = await synthesizer.analyze(sample_orchestration_request)
    assert result.status == ProviderStatus.SUCCESS
    assert result.provider == "scientific_synthesis"
    assert "Reed-Xiaoli Detector" in result.response
    assert "14 anomalous cluster" in result.response
    assert "ROC AUC of 0.9421" in result.response
    assert "chemical identity" in result.response


@pytest.mark.asyncio
async def test_provider_failure_isolation(sample_orchestration_request):
    req = sample_orchestration_request.model_copy()
    req.providers = ["nvidia_nim", "huggingface", "scientific_synthesis"]

    # Mock both external provider instances directly to simulate network timeout / quota error
    with patch.object(
        orchestrator.providers["nvidia_nim"],
        "analyze",
        new=AsyncMock(
            return_value=ProviderResult(
                provider="nvidia_nim",
                model="test-model",
                task=req.task.value,
                status=ProviderStatus.FAILED,
                error="NVIDIA NIM request timed out after 12s",
            )
        ),
    ), patch.object(
        orchestrator.providers["huggingface"],
        "analyze",
        new=AsyncMock(
            return_value=ProviderResult(
                provider="huggingface",
                model="test-model",
                task=req.task.value,
                status=ProviderStatus.QUOTA_EXCEEDED,
                error="Hugging Face router quota status 402: Payment Required",
            )
        ),
    ):
        response = await orchestrator.orchestrate(req)
        assert response.status == "completed"
        # Scientific baseline must succeed even when external APIs fail
        assert response.providers_successful >= 1
        assert any(r.provider == "scientific_synthesis" and r.status == ProviderStatus.SUCCESS for r in response.results)
        assert any(r.provider == "nvidia_nim" and r.status == ProviderStatus.FAILED for r in response.results)
        assert any(r.provider == "huggingface" and r.status == ProviderStatus.QUOTA_EXCEEDED for r in response.results)
        assert response.comparative_summary is not None


@pytest.mark.asyncio
async def test_ai_providers_list_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Without header
        res_no_auth = await ac.get("/internal/v1/ai/providers")
        assert res_no_auth.status_code == 401

        # With header
        res = await ac.get(
            "/internal/v1/ai/providers",
            headers={"X-Internal-API-Key": settings.INTERNAL_API_KEY},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "success"
        assert data["providers_count"] >= 3
        names = [p["name"] for p in data["providers"]]
        assert "nvidia_nim" in names
        assert "huggingface" in names
        assert "scientific_synthesis" in names


@pytest.mark.asyncio
async def test_ai_explain_endpoint(sample_orchestration_request):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        payload = sample_orchestration_request.model_dump()

        res = await ac.post(
            "/internal/v1/ai/explain",
            json=payload,
            headers={"X-Internal-API-Key": settings.INTERNAL_API_KEY},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "completed"
        assert len(data["results"]) >= 1
        assert data["comparative_summary"] is not None
