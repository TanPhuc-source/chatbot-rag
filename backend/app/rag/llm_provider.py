"""
LLM Provider — chuyển đổi qua biến môi trường LLM_PROVIDER

LLM_PROVIDER=groq   → Groq API (nhanh, rẻ, mặc định)
LLM_PROVIDER=ollama → Ollama local (khi có RAM đủ)
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import AsyncIterator
from functools import lru_cache

from app.config import get_settings
from app.utils.logger import logger


class BaseLLMProvider(ABC):
    """Interface chung. Mọi provider phải implement 2 method này."""

    @abstractmethod
    async def chat(self, messages: list[dict], **kwargs) -> str:
        """Trả về full response."""
        ...

    @abstractmethod
    async def stream(self, messages: list[dict], **kwargs) -> AsyncIterator[str]:
        """Yield từng token để streaming."""
        ...


# ── Groq ───────────────────────────────────────────────────────────────────
class GroqProvider(BaseLLMProvider):
    """
    Groq — inference siêu nhanh qua API.
    Model đề xuất: llama-3.3-70b-versatile (cân bằng tốt/nhanh/rẻ)
    """

    def __init__(self) -> None:
        from groq import AsyncGroq

        settings = get_settings()
        self._client = AsyncGroq(api_key=settings.GROQ_API_KEY)
        self._model = settings.GROQ_MODEL
        logger.info(f"LLM Provider: Groq ({self._model})")

    async def chat(self, messages: list[dict], **kwargs) -> str:
        response = await self._client.chat.completions.create(
            model=self._model,
            messages=messages,
            temperature=kwargs.get("temperature", 0.1),
            max_tokens=kwargs.get("max_tokens", 2048),
        )
        return response.choices[0].message.content

    async def stream(self, messages: list[dict], **kwargs) -> AsyncIterator[str]:
        stream = await self._client.chat.completions.create(
            model=self._model,
            messages=messages,
            temperature=kwargs.get("temperature", 0.1),
            max_tokens=kwargs.get("max_tokens", 2048),
            stream=True,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta


# ── Ollama ─────────────────────────────────────────────────────────────────
class OllamaProvider(BaseLLMProvider):
    """
    Ollama — chạy local, không tốn API.
    Dùng khi nâng RAM đủ để chạy llama3.2 hoặc qwen2.5.
    """

    def __init__(self) -> None:
        import ollama as _ollama

        settings = get_settings()
        self._client = _ollama.AsyncClient(host=settings.OLLAMA_BASE_URL)
        self._model = settings.OLLAMA_MODEL
        logger.info(f"LLM Provider: Ollama local ({self._model})")

    async def chat(self, messages: list[dict], **kwargs) -> str:
        response = await self._client.chat(
            model=self._model,
            messages=messages,
            options={
                "temperature": kwargs.get("temperature", 0.1),
                "num_predict": kwargs.get("max_tokens", 2048),
            },
        )
        return response["message"]["content"]

    async def stream(self, messages: list[dict], **kwargs) -> AsyncIterator[str]:
        async for chunk in await self._client.chat(
            model=self._model,
            messages=messages,
            stream=True,
            options={"temperature": kwargs.get("temperature", 0.1)},
        ):
            content = chunk["message"]["content"]
            if content:
                yield content


# ── Factory ────────────────────────────────────────────────────────────────
@lru_cache(maxsize=1)
def get_llm_provider() -> BaseLLMProvider:
    """
    Singleton LLM provider.
    Đổi LLM_PROVIDER trong .env là chuyển provider, không cần sửa code.
    """
    settings = get_settings()

    providers: dict[str, type[BaseLLMProvider]] = {
        "groq": GroqProvider,
        "ollama": OllamaProvider,
    }

    provider_cls = providers.get(settings.LLM_PROVIDER)
    if not provider_cls:
        raise ValueError(
            f"Unknown LLM provider: '{settings.LLM_PROVIDER}'. "
            f"Chọn một trong: {list(providers.keys())}"
        )

    return provider_cls()
