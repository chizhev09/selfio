# Клиент OpenRouter для image-generation и извлечения base64-картинки из ответа.
import asyncio
import base64
import json
import random
import re
from typing import Any

import httpx
from fastapi import HTTPException, status

from app.core.config import get_settings

OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_MAX_RETRIES = 4
NANO_BANANA_MODEL = "google/gemini-3-pro-image-preview"


def normalize_openrouter_model_id(_legacy_model: str) -> str:
    """Возвращает единственный id модели картинки на OpenRouter (Gemini); аргумент не используется, очередь со старыми БД не ломается."""
    return NANO_BANANA_MODEL


NANO_BANANA_PROMPT_TEMPLATE = """TASK:
Place the person from the reference image into a new scene, preserving a strong and recognizable likeness while naturally adapting them to the environment.

---
{manifest_prompt}
---

MOMENT & NATURAL FEEL (KEY)
- The image should feel like a candid, unposed moment - not staged or overly composed.
- Capture spontaneity, as if the photo was taken between moments rather than during a posed shot.
- Subtle imperfection is important: slight asymmetry in expression, tiny irregularities in posture, natural hand placement.
- Expression should feel alive and nuanced - not neutral or blank, but with a hint of inner thought, emotion, or presence.
- Avoid a commercial or stock photo aesthetic - prioritize authenticity and atmosphere over technical perfection.
- Small real-life details are welcome: loose strands of hair, uneven light patches, micro-tension in the face, natural inconsistencies.
- The subject should feel like a real person in a real moment, not a model posing for a camera.

IDENTITY PRESERVATION (IMPORTANT)
- Maintain a strong resemblance to the person in the reference image.
- Preserve key facial features: eye shape, nose structure, lip shape, face proportions, and overall likeness.
- Keep hairstyle and general appearance consistent with the reference.
- Allow subtle, natural adjustments so the face integrates realistically with the new lighting and scene.
- Avoid distortion, exaggeration, or stylization.

SCENE INTEGRATION
- Adapt skin tone, shadows, and highlights to match the scene lighting naturally.
- Ensure consistent color temperature across subject and environment.
- Maintain realistic proportions between head and body.

BACKGROUND REALISM
- Background must retain full detail and structure (no artificial blur smearing).
- Depth of field should be optically realistic and gradual.
- Trees, lights, furniture, and architecture must remain clearly defined.
- Natural bokeh only where physically accurate.

SKIN & DETAIL QUALITY
- Realistic skin texture with natural variation (no over-smoothing).
- Visible fine detail such as pores and subtle skin tone variation.
- Natural eye detail with sharp focus and realistic reflections.
- No beauty filter or plastic-like rendering.

FINAL QUALITY
- Seamless, photorealistic integration of subject and environment.
- Consistent lighting, grain, and micro-contrast across the image.
- Looks like a real photograph taken in a single shot.
"""


def _resolve_nano_banana_aspect_ratio(aspect_ratio: str) -> str:
    """Оставляет только форматы из UI окна генерации."""
    supported = {"9:16", "1:1", "4:5", "16:9"}
    normalized = aspect_ratio.strip()
    if normalized in supported:
        return normalized
    return "9:16"


def _resolve_nano_banana_image_size(quality: str) -> str:
    """Ставит размер выхода Gemini: standard → 1K, pro → 2K."""
    return "2K" if quality.strip().lower() == "pro" else "1K"


def _build_nano_banana_prompt(manifest_prompt: str) -> str:
    """Собирает финальный промпт для Nano Banana с вложенным текстом из manifest.json."""
    normalized_manifest_prompt = manifest_prompt.strip()
    if not normalized_manifest_prompt:
        normalized_manifest_prompt = "Use the scene description from manifest.json."
    return NANO_BANANA_PROMPT_TEMPLATE.format(manifest_prompt=normalized_manifest_prompt)


def _maybe_data_url(value: Any) -> str | None:
    """Возвращает data URL изображения, если строка уже в нужном формате."""
    if isinstance(value, str) and value.startswith("data:image/"):
        return value
    return None


def _extract_data_url_from_response(payload: dict[str, Any]) -> str:
    """Ищет data URL изображения в разных форматах ответа OpenRouter."""
    # Вариант OpenAI-style: top-level data[].b64_json.
    top_data = payload.get("data")
    if isinstance(top_data, list):
        for item in top_data:
            if not isinstance(item, dict):
                continue
            b64_json = item.get("b64_json")
            if isinstance(b64_json, str) and b64_json.strip():
                return f"data:image/png;base64,{b64_json.strip()}"
            url = _maybe_data_url(item.get("url"))
            if url:
                return url

    choices = payload.get("choices")
    if not isinstance(choices, list) or not choices:
        raise ValueError("OpenRouter не вернул choices.")
    message = choices[0].get("message") if isinstance(choices[0], dict) else None
    if not isinstance(message, dict):
        raise ValueError("OpenRouter не вернул message.")
    content = message.get("content")
    direct = _maybe_data_url(content)
    if direct:
        return direct

    if isinstance(content, list):
        for item in content:
            if not isinstance(item, dict):
                continue
            b64_json = item.get("b64_json")
            if isinstance(b64_json, str) and b64_json.strip():
                return f"data:image/png;base64,{b64_json.strip()}"
            if item.get("type") == "image_url":
                image_url = item.get("image_url")
                if isinstance(image_url, dict):
                    url = _maybe_data_url(image_url.get("url"))
                    if url:
                        return url
            if item.get("type") == "output_image":
                image_data = _maybe_data_url(item.get("image_data"))
                if image_data:
                    return image_data
            maybe_url = item.get("url")
            if isinstance(maybe_url, str) and maybe_url.startswith("data:image/"):
                return maybe_url
            # Некоторые провайдеры кладут URL картинки в текстовом блоке.
            text_value = item.get("text")
            if isinstance(text_value, str):
                text_data_url = _extract_data_url_from_text(text_value)
                if text_data_url:
                    return text_data_url
                text_http_url = _extract_http_image_url_from_text(text_value)
                if text_http_url:
                    return text_http_url

    # Иногда провайдер кладёт base64 прямо в message.image / message.b64_json.
    message_b64 = message.get("b64_json")
    if isinstance(message_b64, str) and message_b64.strip():
        return f"data:image/png;base64,{message_b64.strip()}"
    message_image = _maybe_data_url(message.get("image"))
    if message_image:
        return message_image

    # Частый формат у image-моделей: message.images = [{image_url|url|b64_json|image_data}, ...]
    message_images = message.get("images")
    if isinstance(message_images, list):
        for image_item in message_images:
            if isinstance(image_item, str):
                image_url = _maybe_data_url(image_item)
                if image_url:
                    return image_url
                continue
            if not isinstance(image_item, dict):
                continue
            b64_json = image_item.get("b64_json")
            if isinstance(b64_json, str) and b64_json.strip():
                return f"data:image/png;base64,{b64_json.strip()}"
            image_data = _maybe_data_url(image_item.get("image_data"))
            if image_data:
                return image_data
            url = _maybe_data_url(image_item.get("url"))
            if url:
                return url
            nested_image_url = image_item.get("image_url")
            if isinstance(nested_image_url, dict):
                nested_url = _maybe_data_url(nested_image_url.get("url"))
                if nested_url:
                    return nested_url

    # Иногда image URL приходит простым текстом в content.
    if isinstance(content, str):
        content_data_url = _extract_data_url_from_text(content)
        if content_data_url:
            return content_data_url
        content_http_url = _extract_http_image_url_from_text(content)
        if content_http_url:
            return content_http_url

    # Если модель явно отказалась, поднимаем читаемую причину.
    refusal = message.get("refusal")
    refusal_text = _extract_text_from_unknown_value(refusal)
    if not refusal_text:
        refusal_text = _extract_text_from_unknown_value(message.get("reasoning_details"))
    if refusal_text:
        raise ValueError(f"Модель отклонила запрос: {refusal_text[:600]}")

    raise ValueError(
        "OpenRouter не вернул изображение в ожидаемом формате. "
        f"Доступные ключи message: {', '.join(sorted(message.keys()))}"
    )


def _parse_data_url(data_url: str) -> tuple[bytes, str]:
    """Преобразует data URL (base64) в bytes и расширение файла."""
    if not data_url.startswith("data:image/") or ";base64," not in data_url:
        raise ValueError("Некорректный data URL изображения.")
    header, encoded = data_url.split(",", 1)
    mime = header.split(";", 1)[0].replace("data:", "").strip().lower()
    extension = "jpg"
    if mime == "image/png":
        extension = "png"
    elif mime == "image/webp":
        extension = "webp"
    elif mime == "image/gif":
        extension = "gif"
    raw = base64.b64decode(encoded, validate=False)
    return raw, extension


async def _download_image_by_url(url: str) -> tuple[bytes, str]:
    """Скачивает изображение по http(s) URL и определяет расширение по Content-Type."""
    async with httpx.AsyncClient(timeout=120.0, follow_redirects=True) as client:
        response = await client.get(url)
    if response.status_code < 200 or response.status_code >= 300:
        raise ValueError(f"Не удалось скачать изображение по URL: {response.status_code}")
    content_type = str(response.headers.get("content-type", "")).split(";", 1)[0].strip().lower()
    extension = "jpg"
    if content_type == "image/png":
        extension = "png"
    elif content_type == "image/webp":
        extension = "webp"
    elif content_type == "image/gif":
        extension = "gif"
    return response.content, extension


def _extract_data_url_from_text(text: str) -> str | None:
    """Ищет data:image URL внутри текстового поля ответа."""
    match = re.search(r"(data:image/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=\s]+)", text)
    if not match:
        return None
    return re.sub(r"\s+", "", match.group(1))


def _extract_http_image_url_from_text(text: str) -> str | None:
    """Ищет http(s)-ссылку на изображение внутри текстового поля ответа."""
    match = re.search(r"(https?://[^\s\"'<>]+(?:\.png|\.jpg|\.jpeg|\.webp|\.gif)(?:\?[^\s\"'<>]*)?)", text, re.I)
    if not match:
        return None
    return match.group(1)


def _extract_text_from_unknown_value(value: Any) -> str | None:
    """Преобразует произвольное поле OpenRouter (строка/массив/объект) в текст для диагностики."""
    if isinstance(value, str):
        cleaned = value.strip()
        return cleaned or None
    if isinstance(value, list):
        chunks: list[str] = []
        for item in value:
            text = _extract_text_from_unknown_value(item)
            if text:
                chunks.append(text)
        return "\n".join(chunks).strip() or None
    if isinstance(value, dict):
        parts: list[str] = []
        for key in ("text", "message", "reason", "detail", "code"):
            extracted = _extract_text_from_unknown_value(value.get(key))
            if extracted:
                parts.append(extracted)
        if parts:
            return " | ".join(parts)
        # Если в объекте нет ожидаемых ключей с текстом, возвращаем JSON как есть.
        try:
            serialized = json.dumps(value, ensure_ascii=False)
            return serialized[:1000] if serialized else None
        except (TypeError, ValueError):
            return None
    return None


async def generate_image_with_openrouter(
    *,
    model: str,
    prompt: str,
    input_image_urls: list[str] | None = None,
    aspect_ratio: str = "9:16",
    quality: str = "standard",
) -> tuple[bytes, str]:
    """Вызывает OpenRouter и возвращает сгенерированное изображение (bytes + extension)."""
    settings = get_settings()
    api_key = settings.openrouter_api_key.strip()
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OPENROUTER_API_KEY не задан в backend/.env.",
        )
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    image_urls = [u.strip() for u in (input_image_urls or []) if isinstance(u, str) and u.strip()]
    if not image_urls:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Для Nano Banana нужно фото пользователя (input_image_urls[0]).",
        )
    message_content: list[dict[str, Any]] = []
    # Одно входное изображение — фото пользователя (data URL из S3).
    for url in image_urls[:1]:
        message_content.append({"type": "image_url", "image_url": {"url": url}})
    message_content.append({"type": "text", "text": _build_nano_banana_prompt(prompt)})

    resolved_aspect_ratio = _resolve_nano_banana_aspect_ratio(aspect_ratio)
    resolved_image_size = _resolve_nano_banana_image_size(quality)
    request_payload: dict[str, Any] = {
        "model": normalize_openrouter_model_id(model),
        "messages": [{"role": "user", "content": message_content}],
        "modalities": ["image", "text"],
        "image_config": {
            "aspect_ratio": resolved_aspect_ratio,
            "image_size": resolved_image_size,
        },
    }
    response: httpx.Response | None = None
    async with httpx.AsyncClient(timeout=120.0) as client:
        for attempt in range(1, OPENROUTER_MAX_RETRIES + 1):
            try:
                response = await client.post(OPENROUTER_CHAT_URL, headers=headers, json=request_payload)
            except httpx.HTTPError as exc:
                if attempt >= OPENROUTER_MAX_RETRIES:
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"Сетевая ошибка при вызове OpenRouter: {exc}",
                    ) from exc
                await asyncio.sleep(min(2 ** attempt, 8) + random.uniform(0.05, 0.2))
                continue

            if response.status_code < 400:
                break

            retryable_statuses = {429, 500, 502, 503, 504}
            if response.status_code not in retryable_statuses or attempt >= OPENROUTER_MAX_RETRIES:
                break

            retry_after = 0.0
            retry_header = response.headers.get("retry-after")
            if retry_header:
                try:
                    retry_after = float(retry_header)
                except ValueError:
                    retry_after = 0.0
            if retry_after <= 0:
                try:
                    error_json = response.json()
                    retry_after = float(error_json.get("error", {}).get("metadata", {}).get("retry_after_seconds", 0))
                except (ValueError, TypeError, json.JSONDecodeError):
                    retry_after = 0.0
            await asyncio.sleep(max(retry_after, min(2 ** attempt, 8) + random.uniform(0.05, 0.2)))

    if response is None or response.status_code >= 400:
        status_code = response.status_code if response is not None else "no_response"
        body = response.text[:700] if response is not None else "empty response"
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"OpenRouter вернул ошибку {status_code}: {body}",
        )
    try:
        payload = response.json()
        data_url = _extract_data_url_from_response(payload)
        if data_url.startswith("http://") or data_url.startswith("https://"):
            return await _download_image_by_url(data_url)
        return _parse_data_url(data_url)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Некорректный ответ OpenRouter: {exc}",
        ) from exc
