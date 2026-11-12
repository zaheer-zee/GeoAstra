import asyncio
from typing import Dict, List, Optional
from app.core.config import settings
from app.providers.base import BaseAIProvider
from app.providers.schemas import (
    OrchestrationRequest,
    OrchestrationResponse,
    ProviderResult,
    ProviderStatus,
)
from app.providers.nvidia_provider import NvidiaNimProvider
from app.providers.huggingface_provider import HuggingFaceProvider
from app.providers.nararouter_provider import NaraRouterProvider


class ScientificRuleSynthesizer(BaseAIProvider):
    """
    Deterministic scientific interpretation engine based on remote sensing physics.
    Acts as the baseline scientific authority and offline fallback when external
    AI APIs are unavailable or exhausted.
    """

    def __init__(self):
        super().__init__(name="scientific_synthesis")

    def is_configured(self) -> bool:
        return True

    async def analyze(self, request: OrchestrationRequest) -> ProviderResult:
        metrics = request.metrics
        dataset = request.dataset
        eval_metrics = metrics.get("evaluation") or {}

        algo = request.algorithm.upper()
        detected_count = metrics.get("detected_features_count", 0)
        pixel_count = metrics.get("pixel_count", 1)
        anomaly_ratio = (detected_count / pixel_count) * 100 if pixel_count > 0 else 0.0

        auc_info = ""
        if isinstance(eval_metrics.get("auc"), (int, float)):
            auc_val = float(eval_metrics["auc"])
            perf = "high discrimination" if auc_val >= 0.85 else "moderate discrimination"
            auc_info = f" with ROC AUC of {auc_val:.4f} indicating {perf}"

        if algo == "RXD":
            physics_desc = (
                f"The Reed-Xiaoli Detector identified {detected_count} anomalous cluster(s) "
                f"({anomaly_ratio:.3f}% of scene area) exhibiting statistically significant Mahalanobis distance "
                f"deviations from the global spectral background covariance{auc_info}. "
                f"These regions represent spectral outliers, which may correspond to man-made materials, rare minerals, "
                f"or sub-pixel spatial anomalies. Note: statistical anomaly detection does not assert chemical identity."
            )
        elif algo in ("MATCHED_FILTER", "MF"):
            physics_desc = (
                f"The Matched Filter target detector suppressed estimated background clutter while maximizing "
                f"contrast along the target signature direction, resolving {detected_count} target candidate cluster(s){auc_info}. "
                f"Pixel intensity corresponds to the relative abundance / projection onto the target spectrum."
            )
        elif algo == "CEM":
            physics_desc = (
                f"Constrained Energy Minimization (CEM) constrained the target response to unity while suppressing "
                f"the sample correlation energy across {metrics.get('processed_bands', 'N/A')} active bands, "
                f"yielding {detected_count} localized cluster(s){auc_info}."
            )
        else:
            physics_desc = (
                f"Multi-objective spectral detection fusion combined target projection with anomaly scoring "
                f"across {metrics.get('processed_bands', 'N/A')} bands, isolating {detected_count} high-confidence detections."
            )

        return ProviderResult(
            provider=self.name,
            model="scientific-physics-rules-v1",
            task=request.task.value,
            status=ProviderStatus.SUCCESS,
            response=physics_desc,
            latency_seconds=0.001,
            metadata={"dataset": dataset.get("dataset_name", "Unknown")},
        )


class AIOrchestrator:
    """
    Parallel AI provider orchestrator supporting Hugging Face, NVIDIA NIM, and NaraRouter.
    Applies failure isolation: failures in external APIs never fail the analysis workflow.
    """

    def __init__(self):
        self.providers: Dict[str, BaseAIProvider] = {
            "nvidia_nim": NvidiaNimProvider(
                api_key=getattr(settings, "NVIDIA_NIM_API_KEY", None),
                model_id=getattr(settings, "NVIDIA_NIM_MODEL_ID", "nvidia/llama-3.1-nemotron-70b-instruct"),
            ),
            "huggingface": HuggingFaceProvider(
                token=getattr(settings, "HUGGINGFACE_ACCESS_TOKEN", None),
                model_id=getattr(settings, "HUGGINGFACE_MODEL_ID", "meta-llama/Llama-3.2-3B-Instruct"),
            ),
            "nararouter": NaraRouterProvider(
                api_key=getattr(settings, "NARAROUTER_API_KEY", None),
                model_id=getattr(settings, "NARAROUTER_MODEL_ID", "deepseek/deepseek-chat"),
            ),
            "scientific_synthesis": ScientificRuleSynthesizer(),
        }

    async def orchestrate(
        self, request: OrchestrationRequest
    ) -> OrchestrationResponse:
        """
        Dispatch analysis explanation request across configured providers concurrently.
        """
        # Determine which providers to query
        if request.providers:
            target_names = [p.lower() for p in request.providers if p.lower() in self.providers]
        else:
            # Query all configured providers plus baseline synthesizer
            target_names = [
                name
                for name, provider in self.providers.items()
                if provider.is_configured() or name == "scientific_synthesis"
            ]

        # Ensure scientific_synthesis is always included as baseline authority
        if "scientific_synthesis" not in target_names:
            target_names.append("scientific_synthesis")

        tasks = [self.providers[name].analyze(request) for name in target_names]
        raw_results = await asyncio.gather(*tasks, return_exceptions=True)

        results: List[ProviderResult] = []
        successful_count = 0

        for name, res in zip(target_names, raw_results):
            if isinstance(res, Exception):
                results.append(
                    ProviderResult(
                        provider=name,
                        model="unknown",
                        task=request.task.value,
                        status=ProviderStatus.FAILED,
                        error=f"Unhandled provider failure: {str(res)}",
                    )
                )
            else:
                results.append(res)
                if res.status == ProviderStatus.SUCCESS:
                    successful_count += 1

        # Synthesize comparative summary
        comparative_summary = self._build_comparative_summary(results)

        return OrchestrationResponse(
            analysis_id=request.analysis_id,
            status="completed",
            providers_called=len(target_names),
            providers_successful=successful_count,
            results=results,
            comparative_summary=comparative_summary,
        )

    def _build_comparative_summary(self, results: List[ProviderResult]) -> str:
        successful_replies = [r for r in results if r.status == ProviderStatus.SUCCESS and r.response]
        if not successful_replies:
            return "No provider produced a valid explanation."

        if len(successful_replies) == 1:
            return successful_replies[0].response

        lines = ["Multi-Provider Comparative Synthesis:"]
        for r in successful_replies:
            lines.append(f"[{r.provider} ({r.model})]: {r.response}")
        return "\n\n".join(lines)


orchestrator = AIOrchestrator()
