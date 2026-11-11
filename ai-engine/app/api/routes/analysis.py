from typing import Optional, Dict, Any
from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel
from app.core.config import settings

router = APIRouter(prefix="/internal/v1/analysis", tags=["Internal Analysis"])


class AnalysisRunRequest(BaseModel):
    analysis_id: str
    area_id: str
    scene_id: str
    algorithm: str
    algorithm_configuration: Dict[str, Any] = {}
    target_signature_id: Optional[str] = None


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

    # In Milestone 03, this acts as the internal processing contract.
    # Full scientific algorithms (RXD, Matched Filter, CEM) are integrated in Milestone 05.
    return AnalysisRunResponse(
        status="success",
        analysis_id=request.analysis_id,
        result_type="anomaly_detection"
        if request.algorithm == "rxd"
        else "combined_detection",
        algorithm=request.algorithm,
        metrics={
            "execution_time_ms": 480,
            "processed_bands": 224,
            "detected_anomalies_count": 18,
            "mean_background_variance": 0.042,
        },
        artifacts={
            "raster_storage_key": f"storage/output/{request.analysis_id}_score.tif",
            "vector_storage_key": f"storage/output/{request.analysis_id}_polygons.geojson",
            "preview_storage_key": f"storage/previews/{request.analysis_id}_preview.png",
        },
    )

