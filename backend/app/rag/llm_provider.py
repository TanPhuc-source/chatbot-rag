"""
LLM Provider — chuyển đổi qua biến môi trường LLM_PROVIDER

LLM_PROVIDER=groq   → Groq API (nhanh, rẻ, mặc định)
LLM_PROVIDER=ollama → Ollama local (khi có RAM đủ)
LLM_PROVIDER=openai → OpenAI GPT (gpt-4o, gpt-4o-mini, ...)
LLM_PROVIDER=gemini → Google Gemini (gemini-2.0-flash, gemini-1.5-pro, ...)
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


# ── OpenAI ─────────────────────────────────────────────────────────────────
class OpenAIProvider(BaseLLMProvider):
    """
    OpenAI — GPT-4o, GPT-4o-mini, o1, ...
    Cài: pip install openai
    Model đề xuất: gpt-4o-mini (rẻ, nhanh), gpt-4o (mạnh nhất)
    """

    def __init__(self) -> None:
        from openai import AsyncOpenAI

        settings = get_settings()
        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY chưa được cấu hình trong .env")

        self._client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self._model = settings.OPENAI_MODEL
        logger.info(f"LLM Provider: OpenAI ({self._model})")

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


# ── Gemini ─────────────────────────────────────────────────────────────────
class GeminiProvider(BaseLLMProvider):
    """
    Google Gemini — gemini-2.0-flash, gemini-1.5-pro, ...
    Cài: pip install google-genai
    Model đề xuất: gemini-2.0-flash (nhanh, rẻ), gemini-1.5-pro (mạnh)

    Lưu ý: Gemini dùng format message khác — role chỉ có "user" và "model"
    (không có "assistant"). Provider này tự convert trước khi gửi.
    """

    def __init__(self) -> None:
        from google import genai
        from google.genai import types

        settings = get_settings()
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY chưa được cấu hình trong .env")

        self._client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self._model = settings.GEMINI_MODEL
        self._types = types
        logger.info(f"LLM Provider: Gemini ({self._model})")

    def _convert_messages(self, messages: list[dict]) -> tuple[str | None, list]:
        """
        Convert từ format OpenAI sang format Gemini.
        - system message → tách riêng thành system_instruction
        - user/assistant → contents list với role "user"/"model"
        """
        system_instruction = None
        contents = []

        for msg in messages:
            role = msg["role"]
            content = msg["content"]

            if role == "system":
                system_instruction = content
            elif role == "user":
                contents.append(self._types.Content(
                    role="user",
                    parts=[self._types.Part(text=content)],
                ))
            elif role == "assistant":
                # Gemini dùng "model" thay vì "assistant"
                contents.append(self._types.Content(
                    role="model",
                    parts=[self._types.Part(text=content)],
                ))

        return system_instruction, contents

    async def chat(self, messages: list[dict], **kwargs) -> str:
        system_instruction, contents = self._convert_messages(messages)

        config = self._types.GenerateContentConfig(
            temperature=kwargs.get("temperature", 0.1),
            max_output_tokens=kwargs.get("max_tokens", 2048),
            system_instruction=system_instruction,
        )

        response = await self._client.aio.models.generate_content(
            model=self._model,
            contents=contents,
            config=config,
        )
        return response.text

    async def stream(self, messages: list[dict], **kwargs) -> AsyncIterator[str]:
        system_instruction, contents = self._convert_messages(messages)

        config = self._types.GenerateContentConfig(
            temperature=kwargs.get("temperature", 0.1),
            max_output_tokens=kwargs.get("max_tokens", 2048),
            system_instruction=system_instruction,
        )

        async for chunk in await self._client.aio.models.generate_content_stream(
            model=self._model,
            contents=contents,
            config=config,
        ):
            if chunk.text:
                yield chunk.text


# ── Factory ────────────────────────────────────────────────────────────────
@lru_cache(maxsize=1)
def get_llm_provider() -> BaseLLMProvider:
    """
    Singleton LLM provider.
    Đổi LLM_PROVIDER trong .env là chuyển provider, không cần sửa code.
    """
    settings = get_settings()

    providers: dict[str, type[BaseLLMProvider]] = {
        "groq":   GroqProvider,
        "ollama": OllamaProvider,
        "openai": OpenAIProvider,
        "gemini": GeminiProvider,
    }

    provider_cls = providers.get(settings.LLM_PROVIDER)
    if not provider_cls:
        raise ValueError(
            f"Unknown LLM provider: '{settings.LLM_PROVIDER}'. "
            f"Chọn một trong: {list(providers.keys())}"
        )

    return provider_cls()