import time
import httpx
from app.providers.base import BaseAIProvider
from app.providers.schemas import (
    OrchestrationRequest,
    ProviderResult,
    ProviderStatus,
)


class NaraRouterProvider(BaseAIProvider):
    def __init__(
        self,
        api_key: str | None = None,
        model_id: str = "deepseek/deepseek-chat",
        base_url: str = "https://api.nararouter.com/v1",
        timeout: float = 12.0,
    ):
        super().__init__(name="nararouter")
        self.api_key = api_key
        self.model_id = model_id
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def is_configured(self) -> bool:
        return bool(self.api_key and len(self.api_key) > 5)

    async def analyze(self, request: OrchestrationRequest) -> ProviderResult:
        start_time = time.perf_counter()

        if not self.is_configured():
            return ProviderResult(
                provider=self.name,
                model=self.model_id,
                task=request.task.value,
                status=ProviderStatus.DISABLED,
                error="NaraRouter API key not configured",
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
                    "content": "You are a remote sensing AI assistant analyzing hyperspectral detection results.",
                },
                {"role": "user", "content": prompt},
            ],
            "max_tokens": 200,
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
                    return ProviderResult(
                        provider=self.name,
                        model=self.model_id,
                        task=request.task.value,
                        status=ProviderStatus.SUCCESS,
                        response=content,
                        latency_seconds=latency,
                    )
                else:
                    return ProviderResult(
                        provider=self.name,
                        model=self.model_id,
                        task=request.task.value,
                        status=ProviderStatus.FAILED,
                        error=f"NaraRouter status {resp.status_code}: {resp.text[:150]}",
                        latency_seconds=latency,
                    )
        except Exception as e:
            latency = round(time.perf_counter() - start_time, 3)
            return ProviderResult(
                provider=self.name,
                model=self.model_id,
                task=request.task.value,
                status=ProviderStatus.FAILED,
                error=f"NaraRouter exception: {str(e)}",
                latency_seconds=latency,
            )

