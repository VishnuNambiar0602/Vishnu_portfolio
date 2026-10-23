from __future__ import annotations
import json
import os
from typing import Any, Type
import httpx
from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()

class OpenRouterError(RuntimeError):
    pass

class OpenRouterClient:
    def __init__(self, model: str, timeout: float = 180.0):
        self.model = model
        self.base_url = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1").rstrip("/")
        self.api_key = os.getenv("OPENROUTER_API_KEY", "")
        if not self.api_key or self.api_key == "REPLACE_WITH_YOUR_OPENROUTER_KEY":
            raise OpenRouterError("OPENROUTER_API_KEY is not configured. Put it in .env or the environment.")
        self.timeout = timeout

    def structured(self, system: str, user: str, schema_model: Type[BaseModel], *, temperature: float = 0.1, max_tokens: int = 8000) -> BaseModel:
        schema = schema_model.model_json_schema()
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
            "response_format": {
                "type": "json_schema",
                "json_schema": {
                    "name": schema_model.__name__.lower(),
                    "strict": True,
                    "schema": schema,
                },
            },
            "provider": {"require_parameters": True},
        }
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": os.getenv("HARNESS_SITE_URL", "http://localhost:8000"),
            "X-Title": os.getenv("HARNESS_SITE_NAME", "Autonomous Engineering Harness"),
        }
        try:
            with httpx.Client(timeout=self.timeout) as client:
                r = client.post(f"{self.base_url}/chat/completions", headers=headers, json=payload)
            if r.status_code >= 400:
                raise OpenRouterError(f"OpenRouter HTTP {r.status_code}: {r.text[:2000]}")
            data = r.json()
            content = data["choices"][0]["message"]["content"]
            if not isinstance(content, str):
                raise OpenRouterError("Model returned non-text structured output.")
            return schema_model.model_validate(json.loads(content))
        except (httpx.HTTPError, KeyError, IndexError, json.JSONDecodeError) as exc:
            raise OpenRouterError(f"OpenRouter response error: {exc}") from exc
