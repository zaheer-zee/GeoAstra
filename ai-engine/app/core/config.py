from typing import List, Union, Optional
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
import json


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5000",
        "http://localhost:5001",
        "http://localhost:3000",
    ]
    INTERNAL_API_KEY: str = "dev-secret-key-geospectra"

    # AI Provider Settings
    NVIDIA_NIM_API_KEY: Optional[str] = None
    NVIDIA_NIM_MODEL_ID: str = "nvidia/llama-3.1-nemotron-70b-instruct"

    HUGGINGFACE_ACCESS_TOKEN: Optional[str] = None
    HUGGINGFACE_MODEL_ID: str = "meta-llama/Llama-3.2-3B-Instruct"

    NARAROUTER_API_KEY: Optional[str] = None
    NARAROUTER_MODEL_ID: str = "deepseek/deepseek-chat"

    # NASA Earthdata
    EARTHDATA_USERNAME: Optional[str] = None
    EARTHDATA_TOKEN: Optional[str] = None

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: Union[List[str], str]) -> List[str]:
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
                if isinstance(parsed, list):
                    return parsed
            except Exception:
                return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
