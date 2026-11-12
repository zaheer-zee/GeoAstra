from enum import Enum
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class ProviderTask(str, Enum):
    ANALYSIS_EXPLANATION = "analysis_explanation"
    SIGNATURE_INTERPRETATION = "signature_interpretation"
    SPECTRAL_SUMMARY = "spectral_summary"


class ProviderStatus(str, Enum):
    SUCCESS = "success"
    FAILED = "failed"
    DISABLED = "disabled"
    QUOTA_EXCEEDED = "quota_exceeded"


class ProviderResult(BaseModel):
    provider: str
    model: str
    task: str
    status: ProviderStatus
    response: Optional[str] = None
    latency_seconds: float = 0.0
    usage: Optional[Dict[str, int]] = None
    error: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class OrchestrationRequest(BaseModel):
    analysis_id: str
    algorithm: str
    metrics: Dict[str, Any]
    dataset: Dict[str, Any]
    task: ProviderTask = ProviderTask.ANALYSIS_EXPLANATION
    providers: Optional[List[str]] = None


class OrchestrationResponse(BaseModel):
    analysis_id: str
    status: str
    providers_called: int
    providers_successful: int
    results: List[ProviderResult]
    comparative_summary: Optional[str] = None
