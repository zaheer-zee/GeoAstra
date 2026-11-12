import time
import httpx
from app.providers.base import BaseAIProvider
from app.providers.schemas import (
    OrchestrationRequest,
    ProviderResult,
    ProviderStatus,
)


class NvidiaNimProvider(BaseAIProvider):
    def __init__(
        self,
        api_key: str | None = None,
        model_id: str = "nvidia/llama-3.1-nemotron-70b-instruct",
        base_url: str = "https://integrate.api.nvidia.com/v1",
        timeout: float = 12.0,
    ):
        super().__init__(name="nvidia_nim")
        self.api_key = api_key
        self.model_id = model_id
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def is_configured(self) -> bool:
        return bool(self.api_key and self.api_key.startswith("nvapi-"))

    async def analyze(self, request: OrchestrationRequest) -> ProviderResult:
        start_time = time.perf_counter()

        if not self.is_configured():
            return ProviderResult(
                provider=self.name,
                model=self.model_id,
                task=request.task.value,
                status=ProviderStatus.DISABLED,
                error="NVIDIA NIM API key not configured or invalid format",
            )

        prompt = self.build_prompt(request)

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model_id,
            "messages": [
                {
                    "role": "system",
                    "content": "You are an analytical assistant for imaging spectroscopy and hyperspectral earth observation.",
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

                elif resp.status_code in (402, 403, 404, 410):
                    err_msg = f"NVIDIA NIM model/quota status {resp.status_code}: {resp.text[:150]}"
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
                        error=f"NVIDIA NIM error {resp.status_code}: {resp.text[:150]}",
                        latency_seconds=latency,
                    )

        except httpx.TimeoutException:
            latency = round(time.perf_counter() - start_time, 3)
            return ProviderResult(
                provider=self.name,
                model=self.model_id,
                task=request.task.value,
                status=ProviderStatus.FAILED,
                error=f"NVIDIA NIM request timed out after {self.timeout}s",
                latency_seconds=latency,
            )
        except Exception as e:
            latency = round(time.perf_counter() - start_time, 3)
            return ProviderResult(
                provider=self.name,
                model=self.model_id,
                task=request.task.value,
                status=ProviderStatus.FAILED,
                error=f"NVIDIA NIM exception: {str(e)}",
                latency_seconds=latency,
            )

