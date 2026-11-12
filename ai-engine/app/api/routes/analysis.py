from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel
from app.core.config import settings
from app.services.analysis_service import analysis_service

router = APIRouter(prefix="/internal/v1/analysis", tags=["Internal Analysis"])


class AnalysisRunRequest(BaseModel):
    analysis_id: str
    area_id: str
    scene_id: str
    algorithm: str
    algorithm_configuration: Dict[str, Any] = {}
    target_signature_id: Optional[str] = None
    target_spectrum: Optional[List[float]] = None


class AnalysisRunResponse(BaseModel):
    status: str
    analysis_id: str
    result_type: str
    algorithm: str
    metrics: Dict[str, Any]
    artifacts: Dict[str, Optional[str]]


@router.post("/run", response_model=AnalysisRunResponse)
async def run_analysis(
    request: AnalysisRunRequest,
    x_internal_api_key: Optional[str] = Header(None, alias="X-Internal-API-Key"),
):
    if x_internal_api_key != settings.INTERNAL_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing internal API key",
        )

    try:
        result = analysis_service.execute_pipeline(
            analysis_id=request.analysis_id,
            scene_id=request.scene_id,
            algorithm=request.algorithm,
            algorithm_configuration=request.algorithm_configuration,
            target_spectrum=request.target_spectrum,
        )

        return AnalysisRunResponse(
            status=result["status"],
            analysis_id=result["analysis_id"],
            result_type=result["result_type"],
            algorithm=result["algorithm"],
            metrics=result["metrics"],
            artifacts=result["artifacts"],
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Scientific execution failed: {str(e)}",
        )
