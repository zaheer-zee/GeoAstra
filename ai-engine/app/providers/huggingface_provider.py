import time
import httpx
from app.providers.base import BaseAIProvider
from app.providers.schemas import (
    OrchestrationRequest,
    ProviderResult,
    ProviderStatus,
)


class HuggingFaceProvider(BaseAIProvider):
    def __init__(
        self,
        token: str | None = None,
        model_id: str = "meta-llama/Llama-3.2-3B-Instruct",
        base_url: str = "https://router.huggingface.co/hf-inference/v1",
        timeout: float = 12.0,
    ):
        super().__init__(name="huggingface")
        self.token = token
        self.model_id = model_id
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def is_configured(self) -> bool:
        return bool(self.token and self.token.startswith("hf_"))

    async def analyze(self, request: OrchestrationRequest) -> ProviderResult:
        start_time = time.perf_counter()

        if not self.is_configured():
            return ProviderResult(
                provider=self.name,
                model=self.model_id,
                task=request.task.value,
                status=ProviderStatus.DISABLED,
                error="Hugging Face access token not configured or invalid format",
            )

        prompt = self.build_prompt(request)

        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model_id,
            "messages": [
                {
                    "role": "system",
                    "content": "You are a remote sensing specialist in hyperspectral target and anomaly detection.",
                },
                {"role": "user", "content": prompt},
            ],
            "max_tokens": 200,
            "temperature": 0.2,
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers=headers,
                    json=payload,
                )

                latency = round(time.perf_counter() - start_time, 3)

                if resp.status_code == 200:
                    data = resp.json()
                    content = (
                        data.get("choices", [{}])[0]
                        .get("message", {})
                        .get("content", "")
                        .strip()
                    )
                    usage_data = data.get("usage", {})
                    usage = {
                        "prompt_tokens": usage_data.get("prompt_tokens", 0),
                        "completion_tokens": usage_data.get("completion_tokens", 0),
                        "total_tokens": usage_data.get("total_tokens", 0),
                    }
                    return ProviderResult(
                        provider=self.name,
                        model=self.model_id,
                        task=request.task.value,
                        status=ProviderStatus.SUCCESS,
                        response=content,
                        latency_seconds=latency,
                        usage=usage,
                        metadata={"endpoint": f"{self.base_url}/chat/completions"},
                    )

                elif resp.status_code in (402, 403, 404, 429):
                    err_msg = f"Hugging Face router/quota status {resp.status_code}: {resp.text[:150]}"
                    return ProviderResult(
                        provider=self.name,
                        model=self.model_id,
                        task=request.task.value,
                        status=ProviderStatus.QUOTA_EXCEEDED if resp.status_code == 402 else ProviderStatus.FAILED,
                        error=err_msg,
                        latency_seconds=latency,
                    )
                else:
                    return ProviderResult(
                        provider=self.name,
                        model=self.model_id,
                        task=request.task.value,
                        status=ProviderStatus.FAILED,
                        error=f"Hugging Face error {resp.status_code}: {resp.text[:150]}",
                        latency_seconds=latency,
                    )

        except httpx.TimeoutException:
            latency = round(time.perf_counter() - start_time, 3)
            return ProviderResult(
                provider=self.name,
                model=self.model_id,
                task=request.task.value,
                status=ProviderStatus.FAILED,
                error=f"Hugging Face request timed out after {self.timeout}s",
                latency_seconds=latency,
            )
        except Exception as e:
            latency = round(time.perf_counter() - start_time, 3)
            return ProviderResult(
                provider=self.name,
                model=self.model_id,
                task=request.task.value,
                status=ProviderStatus.FAILED,
                error=f"Hugging Face exception: {str(e)}",
                latency_seconds=latency,
            )
