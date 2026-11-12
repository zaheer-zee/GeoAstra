from abc import ABC, abstractmethod
from typing import Dict, Any
from app.providers.schemas import OrchestrationRequest, ProviderResult


class BaseAIProvider(ABC):
    """
    Abstract interface for AI Providers (Hugging Face, NVIDIA NIM, NaraRouter, etc.).
    Adheres to Section 7 of task.md:
    1. Independent scientific authority (LLM explains, never mutates scores).
    2. Failure isolation & timeout handling.
    3. Common normalized result schema.
    """

    def __init__(self, name: str):
        self.name = name

    @abstractmethod
    def is_configured(self) -> bool:
        """Check whether credentials and endpoint configurations are active."""
        pass

    @abstractmethod
    async def analyze(self, request: OrchestrationRequest) -> ProviderResult:
        """Execute task asynchronously and return a normalized ProviderResult."""
        pass

    def build_prompt(self, request: OrchestrationRequest) -> str:
        """
        Build concise scientific context. Never send raw multi-gigabyte cubes.
        """
        metrics = request.metrics
        dataset = request.dataset
        eval_metrics = metrics.get("evaluation") or {}

        auc_str = f", ROC AUC: {eval_metrics.get('auc', 'N/A'):.4f}" if isinstance(eval_metrics.get('auc'), (int, float)) else ""
        clusters_str = metrics.get('detected_features_count', 'N/A')

        return (
            f"You are a scientific remote sensing and imaging spectroscopy expert.\n"
            f"Provide an objective, scientifically disciplined technical interpretation of the following analysis run:\n\n"
            f"- Analysis ID: {request.analysis_id}\n"
            f"- Algorithm: {request.algorithm.upper()}\n"
            f"- Dataset: {dataset.get('dataset_name', 'Unknown')} ({dataset.get('source', 'raster')})\n"
            f"- Input Bands: {metrics.get('input_bands', 'N/A')}, Processed Bands: {metrics.get('processed_bands', 'N/A')}\n"
            f"- Bad Bands Filtered: {metrics.get('bad_bands_removed', 0)}\n"
            f"- Detected Anomalous/Target Clusters: {clusters_str}{auc_str}\n"
            f"- Image Size: {metrics.get('width', 'N/A')}x{metrics.get('height', 'N/A')} ({metrics.get('pixel_count', 'N/A')} pixels)\n\n"
            f"Guidelines:\n"
            f"1. Explain what the algorithm output and clusters indicate physically.\n"
            f"2. Explicitly note that anomaly scores indicate statistical deviation from the local/global background, not a definitive chemical label.\n"
            f"3. Keep the summary under 120 words, concise and professional."
        )

