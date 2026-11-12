from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Header, HTTPException, status
from app.core.config import settings
from app.providers.orchestrator import orchestrator
from app.providers.schemas import (
    OrchestrationRequest,
    OrchestrationResponse,
)

router = APIRouter(prefix="/internal/v1/ai", tags=["AI Provider Orchestration"])


@router.get("/providers")
async def list_providers(
    x_internal_api_key: Optional[str] = Header(None, alias="X-Internal-API-Key"),
):
    if x_internal_api_key != settings.INTERNAL_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing internal API key",
        )

    provider_statuses = [
        {
            "name": name,
            "configured": provider.is_configured(),
            "model_id": getattr(provider, "model_id", "rules-v1"),
        }
        for name, provider in orchestrator.providers.items()
    ]

    return {
        "status": "success",
        "providers_count": len(provider_statuses),
        "providers": provider_statuses,
    }


@router.post("/explain", response_model=OrchestrationResponse)
async def explain_analysis(
    request: OrchestrationRequest,
    x_internal_api_key: Optional[str] = Header(None, alias="X-Internal-API-Key"),
):
    if x_internal_api_key != settings.INTERNAL_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing internal API key",
        )

    try:
        response = await orchestrator.orchestrate(request)
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI orchestration failed: {str(e)}",
        )
