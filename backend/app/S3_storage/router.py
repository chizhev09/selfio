# Presigned-загрузка и учёт файлов в S3; boto3 вызывается в thread pool, БД — асинхронная.
import asyncio
import base64
import json
import re
import uuid
from datetime import datetime
from typing import Annotated, Any

import httpx
from botocore.exceptions import ClientError
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.balance.constants import TOKEN_COST_PRO_GENERATION, TOKEN_COST_REGULAR_GENERATION
from app.balance.service import get_balance, try_spend_tokens
from app.core.config import get_settings
from app.db.session import get_db
from app.db.session import AsyncSessionLocal
from app.models.generation_request import GenerationRequest
from app.models.user import User
from app.models.user_photo import UserPhoto
from app.S3_storage.client import make_s3_client
from app.S3_storage.get_user_photo import list_user_folder_images
from app.S3_storage.paths import SELFIO_S3_PREFIX, SELFIO_USERS_ROOT, user_photo_prefix
from app.S3_storage.schemas import (
    DeleteMyPhotoRequest,
    DeleteMyPhotoResponse,
    GenerationStatusResponse,
    GenerateFromTemplateRequest,
    GenerateFromTemplateResponse,
    HeroCarouselCollectionItem,
    HeroCarouselResponse,
    LibraryCatalogResponse,
    LibraryCategoryItem,
    LibraryIndexCategoriesResponse,
    LibraryIndexCategoryItem,
    LibraryPhotoItem,
    MyPhotosResponse,
    PresignUploadRequest,
    PresignUploadResponse,
    UploadCompleteRequest,
    UserPhotoItem,
)
from app.S3_storage.paths import user_result_generation_prefix
from app.services.openrouter_image import generate_image_with_openrouter

router = APIRouter(prefix="/storage", tags=["storage"])

ALLOWED_CT = frozenset(
    {"image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"}
)

LIBRARY_ROOT_PREFIX = f"{SELFIO_S3_PREFIX}/library/"
LIBRARY_INDEX_OBJECT_KEY = f"{LIBRARY_ROOT_PREFIX}index.json"
LIBRARY_INDEX_FALLBACK_OBJECT_KEY = f"{LIBRARY_ROOT_PREFIX}categories/index.json"
HIRO_CAROUSEL_PREFIX = f"{LIBRARY_ROOT_PREFIX}hiro_carousel/"
HIRO_CAROUSEL_INDEX_KEY = f"{HIRO_CAROUSEL_PREFIX}index.json"
HIRO_CAROUSEL_ALT_PREFIX = f"{LIBRARY_ROOT_PREFIX}hiro_karousel/"
HIRO_CAROUSEL_ALT_INDEX_KEY = f"{HIRO_CAROUSEL_ALT_PREFIX}index.json"

LIBRARY_IMAGE_SUFFIXES = (
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".heic",
    ".heif",
)

LIBRARY_CATEGORY_DEFS: tuple[dict[str, str], ...] = (
    {"id": "portrait", "title": "Портреты", "hint": "свет и характер"},
    {"id": "landscape", "title": "Пейзажи", "hint": "горизонт и глубина"},
    {"id": "family", "title": "Семья и тепло", "hint": "естественные кадры"},
    {"id": "style", "title": "Стиль и детали", "hint": "фактура и цвет"},
)


def _safe_filename(name: str) -> str:
    """Убирает путь и оставляет безопасное имя файла."""
    base = name.replace("\\", "/").split("/")[-1].strip()
    base = re.sub(r"[^a-zA-Z0-9._-]", "_", base)
    return (base[:120] or "upload")[:120]


def _with_swapped_image_extension_case(key: str) -> str | None:
    """Возвращает альтернативный ключ с инвертированным регистром расширения изображения."""
    if key.endswith(".jpg"):
        return f"{key[:-4]}.JPG"
    if key.endswith(".JPG"):
        return f"{key[:-4]}.jpg"
    if key.endswith(".jpeg"):
        return f"{key[:-5]}.JPEG"
    if key.endswith(".JPEG"):
        return f"{key[:-5]}.jpeg"
    if key.endswith(".png"):
        return f"{key[:-4]}.PNG"
    if key.endswith(".PNG"):
        return f"{key[:-4]}.png"
    if key.endswith(".webp"):
        return f"{key[:-5]}.WEBP"
    if key.endswith(".WEBP"):
        return f"{key[:-5]}.webp"
    return None


def _candidate_s3_keys_for_read(object_key: str) -> list[str]:
    """Готовит набор кандидатов ключа для чтения объекта из S3 с учётом старых/новых путей."""
    key = object_key.strip().lstrip("/")
    candidates: list[str] = []
    if key:
        candidates.append(key)
    swapped = _with_swapped_image_extension_case(key)
    if swapped and swapped not in candidates:
        candidates.append(swapped)

    library_prefix = LIBRARY_ROOT_PREFIX
    if key.startswith(library_prefix):
        without_library = key[len(library_prefix) :]
        if without_library and without_library not in candidates:
            candidates.append(without_library)
        swapped_without = _with_swapped_image_extension_case(without_library)
        if swapped_without and swapped_without not in candidates:
            candidates.append(swapped_without)
    elif key and not key.startswith(f"{SELFIO_S3_PREFIX}/"):
        with_library = f"{library_prefix}{key}"
        if with_library not in candidates:
            candidates.append(with_library)
        swapped_with = _with_swapped_image_extension_case(with_library)
        if swapped_with and swapped_with not in candidates:
            candidates.append(swapped_with)
    return candidates


def _get_s3_object_with_fallbacks(client, bucket: str, object_key: str) -> dict[str, Any]:
    """Читает объект из S3, пробуя несколько вариантов ключа при NoSuchKey."""
    last_error: ClientError | None = None
    for candidate in _candidate_s3_keys_for_read(object_key):
        try:
            return client.get_object(Bucket=bucket, Key=candidate)
        except ClientError as exc:
            code = exc.response.get("Error", {}).get("Code", "")
            if code == "NoSuchKey":
                last_error = exc
                continue
            raise
    if last_error is not None:
        raise last_error
    raise RuntimeError(f"Не удалось сформировать ключи для чтения объекта: {object_key}")


def _s3_client():
    """Делегирует в make_s3_client: клиент или None, если в .env не хватает данных для S3."""
    return make_s3_client()


def _require_s3_client():
    """Возвращает клиент S3 или отвечает 503, если конфиг неполный."""
    client = _s3_client()
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "S3 не настроен. Нужны: BUCKET_NAME (или S3_BUCKET), S3_ACCESS_KEY (или AWS_ACCESS_KEY_ID), "
                "S3_SECRET_ACCESS_KEY (или AWS_SECRET_ACCESS_KEY / S3_SECRET_KEY). "
                "Файл .env должен лежать в папке backend рядом с app/."
            ),
        )
    return client


def _presign_get_url(client, bucket: str, object_key: str, expires_in: int = 3600) -> str:
    """Формирует временную ссылку GET на объект в бакете."""
    try:
        return client.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket, "Key": object_key},
            ExpiresIn=expires_in,
            HttpMethod="GET",
        )
    except ClientError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Ошибка S3 при подписи GET: {e}",
        ) from e


def _is_library_image_key(key: str) -> bool:
    """Считает ключ подходящим для витрины, если расширение — графическое."""
    lower = key.lower()
    return any(lower.endswith(s) for s in LIBRARY_IMAGE_SUFFIXES)


def _caption_from_object_key(object_key: str) -> str | None:
    """Формирует подпись к превью из последнего сегмента ключа (имя без расширения)."""
    base = object_key.rstrip("/").split("/")[-1].strip()
    if not base or "." not in base:
        return base or None
    return base.rsplit(".", 1)[0].replace("_", " ")[:80] or None


def _library_view_url(client, bucket: str, object_key: str) -> str:
    """Возвращает URL картинки: публичная база из .env или presigned GET на 7 суток."""
    settings = get_settings()
    base = settings.s3_public_base_url.strip().rstrip("/")
    if base:
        return f"{base}/{object_key}"
    return _presign_get_url(client, bucket, object_key, expires_in=604800)


def _safe_hiro_carousel_cover_filename(name: str) -> str:
    """Оставляет только безопасное имя файла обложки без каталогов и «..»."""
    base = name.replace("\\", "/").split("/")[-1].strip()
    if not base or ".." in name:
        raise ValueError("invalid_cover")
    if not re.match(r"^[a-zA-Z0-9._-]+$", base):
        raise ValueError("invalid_cover")
    return base


def _build_hero_carousel_from_index(
    client,
    bucket: str,
    parsed: dict[str, Any],
) -> HeroCarouselResponse:
    """Собирает ответ API из распарсенного index.json папки hiro_carousel."""
    version = parsed.get("version")
    if not isinstance(version, int):
        version = 1
    raw_collections = parsed.get("collections")
    if not isinstance(raw_collections, list):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="hiro_carousel/index.json: ожидается массив «collections».",
        )
    items: list[HeroCarouselCollectionItem] = []
    for entry in raw_collections:
        if not isinstance(entry, dict):
            continue
        cid = entry.get("id")
        cover = entry.get("cover")
        if not isinstance(cid, str) or not isinstance(cover, str):
            continue
        raw_pids = entry.get("photoIds", [])
        if not isinstance(raw_pids, list):
            raw_pids = []
        try:
            cover_name = _safe_hiro_carousel_cover_filename(cover)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Некорректное имя cover в коллекции «{cid}».",
            ) from exc
        stem = cover_name.rsplit(".", 1)[0]
        candidates: list[str] = []
        raw_ext = cover_name.rsplit(".", 1)[1].lower() if "." in cover_name else "jpg"
        ext_order = [raw_ext, "jpg", "jpeg", "png", "webp"]
        seen_ext: set[str] = set()
        for ext in ext_order:
            ext_norm = ext.lower().strip(".")
            if ext_norm in seen_ext:
                continue
            seen_ext.add(ext_norm)
            for prefix in (HIRO_CAROUSEL_PREFIX, HIRO_CAROUSEL_ALT_PREFIX):
                candidates.append(f"{prefix}{stem}.{ext_norm}")
        object_key = candidates[0]
        for candidate in candidates:
            try:
                client.head_object(Bucket=bucket, Key=candidate)
                object_key = candidate
                break
            except ClientError:
                continue
        photo_ids: list[str] = [str(p).strip() for p in raw_pids if str(p).strip()]
        items.append(
            HeroCarouselCollectionItem(
                id=cid.strip(),
                cover_object_key=object_key,
                cover_url=_library_view_url(client, bucket, object_key),
                photoIds=photo_ids,
            )
        )
    return HeroCarouselResponse(version=version, collections=items)


def _read_hiro_carousel_index_bytes(client, bucket: str) -> bytes:
    """Скачивает S3_selfio/library/hiro_carousel/index.json из бакета."""
    for key in (HIRO_CAROUSEL_INDEX_KEY, HIRO_CAROUSEL_ALT_INDEX_KEY):
        try:
            obj = client.get_object(Bucket=bucket, Key=key)
            body = obj.get("Body")
            return body.read() if body is not None else b""
        except ClientError as e:
            code = e.response.get("Error", {}).get("Code", "")
            if code == "NoSuchKey":
                continue
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Ошибка S3 при чтении hiro_carousel: {e}",
            ) from e
    return b""


def _build_hero_carousel_from_covers(client, bucket: str) -> HeroCarouselResponse:
    """Собирает карусель из cover_* файлов, если index.json отсутствует."""
    items: list[HeroCarouselCollectionItem] = []
    seen: set[str] = set()
    for prefix in (HIRO_CAROUSEL_PREFIX, HIRO_CAROUSEL_ALT_PREFIX):
        try:
            page = client.list_objects_v2(Bucket=bucket, Prefix=prefix, MaxKeys=200)
        except ClientError as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Ошибка S3 при чтении списка hiro_carousel: {e}",
            ) from e
        for obj in page.get("Contents") or []:
            key = str(obj.get("Key") or "")
            if not key or key.endswith("/"):
                continue
            if key in (HIRO_CAROUSEL_INDEX_KEY, HIRO_CAROUSEL_ALT_INDEX_KEY):
                continue
            name = key.rsplit("/", 1)[-1]
            if not re.match(r"^cover[_-]?\d+\.(jpg|jpeg|png|webp)$", name, flags=re.IGNORECASE):
                continue
            cid = name.rsplit(".", 1)[0].lower()
            if cid in seen:
                continue
            seen.add(cid)
            items.append(
                HeroCarouselCollectionItem(
                    id=cid,
                    cover_object_key=key,
                    cover_url=_library_view_url(client, bucket, key),
                    photoIds=[],
                )
            )
    items.sort(key=lambda item: item.id.lower())
    return HeroCarouselResponse(version=1, collections=items)


def _parse_library_index_categories(raw_json: Any) -> list[LibraryIndexCategoryItem]:
    """Нормализует categories из index.json в единый список {id, name}."""
    if not isinstance(raw_json, dict):
        return []
    categories = raw_json.get("categories")
    if not isinstance(categories, list):
        return []

    out: list[LibraryIndexCategoryItem] = []
    for idx, item in enumerate(categories):
        if isinstance(item, str):
            name = item.strip()
            if not name:
                continue
            out.append(LibraryIndexCategoryItem(id=f"cat-{idx}-{name}", name=name))
            continue
        if not isinstance(item, dict):
            continue
        raw_name = item.get("name")
        if not isinstance(raw_name, str):
            continue
        name = raw_name.strip()
        if not name:
            continue
        raw_id = item.get("id")
        cid = raw_id.strip() if isinstance(raw_id, str) and raw_id.strip() else f"cat-{idx}-{name}"
        out.append(LibraryIndexCategoryItem(id=cid, name=name))
    return out


def _load_library_index_categories(client, bucket: str) -> list[LibraryIndexCategoryItem]:
    """Читает S3_selfio/library/index.json и возвращает категории для UI."""
    # Поддерживает оба расположения root-index: новый путь и старый fallback.
    errors: list[str] = []
    raw_bytes = b""
    for key in (LIBRARY_INDEX_OBJECT_KEY, LIBRARY_INDEX_FALLBACK_OBJECT_KEY):
        try:
            obj = client.get_object(Bucket=bucket, Key=key)
            body = obj.get("Body")
            raw_bytes = body.read() if body is not None else b""
            break
        except ClientError as e:
            code = e.response.get("Error", {}).get("Code", "")
            if code == "NoSuchKey":
                errors.append(f"{key}: NoSuchKey")
                continue
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Ошибка S3 при чтении index.json: {e}",
            ) from e
    else:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "Корневой index.json не найден в S3. "
                f"Проверены ключи: {LIBRARY_INDEX_OBJECT_KEY} и {LIBRARY_INDEX_FALLBACK_OBJECT_KEY}. "
                f"Детали: {', '.join(errors) if errors else 'NoSuchKey'}"
            ),
        )

    try:
        parsed = json.loads(raw_bytes.decode("utf-8")) if raw_bytes else {}
    except (UnicodeDecodeError, json.JSONDecodeError) as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Некорректный JSON в {LIBRARY_INDEX_OBJECT_KEY}: {e}",
        ) from e
    return _parse_library_index_categories(parsed)


def _load_library_index_json(client, bucket: str) -> dict[str, Any]:
    """Читает корневой index.json библиотеки и возвращает JSON-объект целиком."""
    errors: list[str] = []
    raw_bytes = b""
    for key in (LIBRARY_INDEX_OBJECT_KEY, LIBRARY_INDEX_FALLBACK_OBJECT_KEY):
        try:
            obj = client.get_object(Bucket=bucket, Key=key)
            body = obj.get("Body")
            raw_bytes = body.read() if body is not None else b""
            break
        except ClientError as e:
            code = e.response.get("Error", {}).get("Code", "")
            if code == "NoSuchKey":
                errors.append(f"{key}: NoSuchKey")
                continue
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Ошибка S3 при чтении index.json: {e}",
            ) from e
    else:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "Корневой index.json не найден в S3. "
                f"Проверены ключи: {LIBRARY_INDEX_OBJECT_KEY} и {LIBRARY_INDEX_FALLBACK_OBJECT_KEY}. "
                f"Детали: {', '.join(errors) if errors else 'NoSuchKey'}"
            ),
        )

    try:
        parsed = json.loads(raw_bytes.decode("utf-8")) if raw_bytes else {}
    except (UnicodeDecodeError, json.JSONDecodeError) as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Некорректный JSON в index.json: {e}",
        ) from e
    if not isinstance(parsed, dict):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Корневой index.json должен быть JSON-объектом.",
        )
    return parsed


def _normalize_library_index_path(index_path: str) -> str:
    """Проверяет и нормализует путь category index внутри S3_selfio/library/."""
    cleaned = index_path.strip().lstrip("/")
    if not cleaned:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пустой index_path.",
        )
    if ".." in cleaned:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="index_path содержит запрещённую последовательность '..'.",
        )
    if not cleaned.endswith(".json"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="index_path должен указывать на .json файл.",
        )
    return cleaned


def _load_library_category_index_json(client, bucket: str, index_path: str) -> dict[str, Any]:
    """Читает category index.json по относительному пути в library/ и возвращает сырой JSON."""
    rel = _normalize_library_index_path(index_path)
    key = f"{LIBRARY_ROOT_PREFIX}{rel}"
    try:
        obj = client.get_object(Bucket=bucket, Key=key)
        body = obj.get("Body")
        raw_bytes = body.read() if body is not None else b""
    except ClientError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Ошибка S3 при чтении category index ({key}): {e}",
        ) from e
    try:
        parsed = json.loads(raw_bytes.decode("utf-8")) if raw_bytes else {}
    except (UnicodeDecodeError, json.JSONDecodeError) as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Некорректный JSON в {key}: {e}",
        ) from e
    if not isinstance(parsed, dict):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Ожидался JSON-объект в {key}.",
        )
    return parsed


def _list_library_for_prefix(
    client,
    bucket: str,
    category_id: str,
) -> list[LibraryPhotoItem]:
    """Собирает список изображений в папке категории, новые файлы выше старых."""
    prefix = f"{LIBRARY_ROOT_PREFIX}{category_id}/"
    out: list[tuple[str, datetime | None]] = []
    token: str | None = None
    while True:
        kwargs: dict[str, Any] = {"Bucket": bucket, "Prefix": prefix, "MaxKeys": 500}
        if token:
            kwargs["ContinuationToken"] = token
        try:
            page = client.list_objects_v2(**kwargs)
        except ClientError as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Ошибка S3 при чтении библиотеки: {e}",
            ) from e
        for obj in page.get("Contents") or []:
            key = obj.get("Key") or ""
            if not key or key.endswith("/"):
                continue
            if not _is_library_image_key(key):
                continue
            lm = obj.get("LastModified")
            out.append((key, lm if isinstance(lm, datetime) else None))
        if not page.get("IsTruncated"):
            break
        token = page.get("NextContinuationToken")
        if not token:
            break

    out.sort(
        key=lambda t: t[1].timestamp() if t[1] is not None else 0.0,
        reverse=True,
    )
    out = out[:80]

    items: list[LibraryPhotoItem] = []
    for key, _lm in out:
        items.append(
            LibraryPhotoItem(
                id=key,
                object_key=key,
                view_url=_library_view_url(client, bucket, key),
                caption=_caption_from_object_key(key),
            )
        )
    return items


def _photo_item(photo: UserPhoto, view_url: str) -> UserPhotoItem:
    """Собирает DTO элемента галереи для ответа API."""
    return UserPhotoItem(
        id=str(photo.id),
        object_key=photo.object_key,
        view_url=view_url,
        original_filename=photo.original_filename,
        created_at=photo.created_at.isoformat(),
    )


def _resolve_effective_model_for_quality(quality: str) -> str:
    """Выбирает модель по качеству: pro отправляет в Flux 2 Pro, standard — в Gemini."""
    normalized = quality.strip().lower()
    if normalized == "pro":
        return "flux 2 pro"
    return "google/gemini-3-pro-image-preview"


def _token_cost_for_quality(quality: str) -> int:
    """Возвращает стоимость генерации в токенах: 20 за pro, 10 за остальное (как на фронте)."""
    if quality.strip().lower() == "pro":
        return TOKEN_COST_PRO_GENERATION
    return TOKEN_COST_REGULAR_GENERATION


async def _process_generation_request(generation_id: uuid.UUID) -> None:
    """В фоне вызывает OpenRouter, сохраняет результат в S3 и обновляет статус задачи."""
    async with AsyncSessionLocal() as db:
        row = await db.get(GenerationRequest, generation_id)
        if row is None:
            return
        row.status = "processing"
        await db.commit()
        await db.refresh(row)

        client = _s3_client()
        if client is None:
            row.status = "failed"
            row.error_message = "S3 не настроен."
            await db.commit()
            return
        bucket = get_settings().resolve_s3_bucket()
        try:
            def _build_input_data_url(object_key: str) -> str:
                obj = _get_s3_object_with_fallbacks(client, bucket, object_key)
                body = obj.get("Body")
                raw_bytes = body.read() if body is not None else b""
                if not raw_bytes:
                    raise RuntimeError(f"S3 object is empty: {object_key}")
                content_type = str(obj.get("ContentType") or "image/jpeg").strip().lower()
                if not content_type.startswith("image/"):
                    content_type = "image/jpeg"
                encoded = base64.b64encode(raw_bytes).decode("ascii")
                return f"data:{content_type};base64,{encoded}"

            input_image_urls: list[str] = []
            user_photo_data_url = await asyncio.to_thread(_build_input_data_url, row.user_photo_object_key)
            if row.generation_type == "one_to_one" and row.template_photo_object_key:
                template_photo_data_url = await asyncio.to_thread(
                    _build_input_data_url, row.template_photo_object_key
                )
                # В one-to-one первым даём user (identity), вторым template (база сцены).
                input_image_urls.append(user_photo_data_url)
                input_image_urls.append(template_photo_data_url)
            else:
                input_image_urls.append(user_photo_data_url)

            image_bytes, ext = await generate_image_with_openrouter(
                model=row.model,
                prompt=row.selected_prompt,
                input_image_urls=input_image_urls,
                aspect_ratio=row.aspect_ratio,
                quality=row.quality,
            )
            result_key = f"{user_result_generation_prefix(row.user_id)}{row.id.hex}.{ext}"
            content_type = f"image/{'jpeg' if ext == 'jpg' else ext}"

            def _put_result() -> None:
                try:
                    client.put_object(
                        Bucket=bucket,
                        Key=result_key,
                        Body=image_bytes,
                        ContentType=content_type,
                    )
                    return
                except ClientError as put_err:
                    code = put_err.response.get("Error", {}).get("Code", "")
                    if code != "SignatureDoesNotMatch":
                        raise

                # Fallback для S3-совместимых провайдеров, где direct put_object нестабилен:
                # используем presigned PUT и загружаем байты как в уже рабочем user_photo flow.
                upload_url = client.generate_presigned_url(
                    "put_object",
                    Params={
                        "Bucket": bucket,
                        "Key": result_key,
                        "ContentType": content_type,
                    },
                    ExpiresIn=900,
                    HttpMethod="PUT",
                )
                response = httpx.put(
                    upload_url,
                    content=image_bytes,
                    headers={"Content-Type": content_type},
                    timeout=120.0,
                )
                if response.status_code < 200 or response.status_code >= 300:
                    raise RuntimeError(
                        f"Presigned PUT failed with status {response.status_code}: {response.text[:300]}"
                    )

            await asyncio.to_thread(_put_result)

            # Токены только после успешной генерации и записи в S3; при нехватке — откат файла в бакете.
            cost_tokens = _token_cost_for_quality(row.quality)
            if await try_spend_tokens(db, row.user_id, cost_tokens) is None:
                row.status = "failed"
                row.error_message = "Недостаточно токенов на балансе для завершения генерации."
                await db.commit()

                def _delete_orphan_result() -> None:
                    try:
                        client.delete_object(Bucket=bucket, Key=result_key)
                    except ClientError:
                        pass

                await asyncio.to_thread(_delete_orphan_result)
                return

            row.status = "done"
            row.result_object_key = result_key
            row.error_message = None
            await db.commit()
        except Exception as exc:
            row.status = "failed"
            row.error_message = str(exc)[:1000]
            await db.commit()


@router.post("/presign-upload", response_model=PresignUploadResponse)
async def presign_upload(
    body: PresignUploadRequest,
    user: Annotated[User, Depends(get_current_user)],
) -> PresignUploadResponse:
    """Выдаёт подписанный URL для PUT файла в бакет (без прокси тела через API)."""
    ct = body.content_type.lower()
    if ct not in ALLOWED_CT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Тип не разрешён. Допустимо: {', '.join(sorted(ALLOWED_CT))}",
        )

    client = _require_s3_client()

    settings = get_settings()
    bucket = settings.resolve_s3_bucket()
    key = f"{user_photo_prefix(user.id)}{uuid.uuid4().hex}_{_safe_filename(body.filename)}"

    def _put_presign() -> str:
        return client.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": bucket,
                "Key": key,
                "ContentType": ct,
            },
            ExpiresIn=900,
            HttpMethod="PUT",
        )

    try:
        upload_url = await asyncio.to_thread(_put_presign)
    except ClientError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Ошибка S3 при подписи: {e}",
        ) from e

    public: str | None = None
    base = settings.s3_public_base_url.strip().rstrip("/")
    if base:
        public = f"{base}/{key}"

    return PresignUploadResponse(
        upload_url=upload_url,
        headers={"Content-Type": ct},
        object_key=key,
        public_url=public,
    )


@router.post("/upload-complete", response_model=UserPhotoItem)
async def upload_complete(
    body: UploadCompleteRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserPhotoItem:
    """Сохраняет запись о загруженном объекте после успешного PUT в бакет."""
    ct = body.content_type.lower()
    if ct not in ALLOWED_CT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Тип не разрешён. Допустимо: {', '.join(sorted(ALLOWED_CT))}",
        )

    photo_prefix = user_photo_prefix(user.id)
    if not body.object_key.startswith(photo_prefix):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Ключ должен быть в папке user_photo: "
                f"{SELFIO_USERS_ROOT}/<ваш_id>/user_photo/… (result_generation сюда не регистрируется)."
            ),
        )

    existing = await db.scalar(select(UserPhoto).where(UserPhoto.object_key == body.object_key))
    if existing is not None:
        if existing.user_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Этот объект уже зарегистрирован за другим пользователем.",
            )
    else:
        row = UserPhoto(
            user_id=user.id,
            object_key=body.object_key,
            content_type=ct,
            original_filename=body.original_filename,
        )
        db.add(row)
        await db.commit()
        await db.refresh(row)
        existing = row

    client = _require_s3_client()
    bucket = get_settings().resolve_s3_bucket()

    def _get_url() -> str:
        return _presign_get_url(client, bucket, existing.object_key)

    url = await asyncio.to_thread(_get_url)
    return _photo_item(existing, url)


@router.get("/library", response_model=LibraryCatalogResponse)
async def get_library_catalog(
    _user: Annotated[User, Depends(get_current_user)],
) -> LibraryCatalogResponse:
    """Отдаёт витрину библиотеки: снимки из папок S3_selfio/library/<категория>/ в бакете."""

    def _build_catalog() -> LibraryCatalogResponse:
        client = _require_s3_client()
        bucket = get_settings().resolve_s3_bucket()
        categories: list[LibraryCategoryItem] = []
        for spec in LIBRARY_CATEGORY_DEFS:
            cid = spec["id"]
            prefix = f"{LIBRARY_ROOT_PREFIX}{cid}/"
            items = _list_library_for_prefix(client, bucket, cid)
            categories.append(
                LibraryCategoryItem(
                    id=cid,
                    title=spec["title"],
                    hint=spec["hint"],
                    prefix=prefix,
                    items=items,
                )
            )
        return LibraryCatalogResponse(categories=categories)

    return await asyncio.to_thread(_build_catalog)


@router.get("/library-index", response_model=LibraryIndexCategoriesResponse)
async def get_library_index_categories(
    _user: Annotated[User, Depends(get_current_user)],
) -> LibraryIndexCategoriesResponse:
    """Возвращает категории напрямую из S3_selfio/library/index.json."""

    def _load() -> LibraryIndexCategoriesResponse:
        client = _require_s3_client()
        bucket = get_settings().resolve_s3_bucket()
        categories = _load_library_index_categories(client, bucket)
        return LibraryIndexCategoriesResponse(categories=categories)

    return await asyncio.to_thread(_load)


@router.get("/library-category-index")
async def get_library_category_index(
    index_path: str,
    _user: Annotated[User, Depends(get_current_user)],
) -> dict[str, Any]:
    """Возвращает category index.json из S3 для поиска и списка шаблонов на фронте."""

    def _load() -> dict[str, Any]:
        client = _require_s3_client()
        bucket = get_settings().resolve_s3_bucket()
        return _load_library_category_index_json(client, bucket, index_path)

    return await asyncio.to_thread(_load)


@router.get("/library-index-raw")
async def get_library_index_raw(
    _user: Annotated[User, Depends(get_current_user)],
) -> dict[str, Any]:
    """Возвращает корневой index.json целиком (включая index_path категорий)."""

    def _load() -> dict[str, Any]:
        client = _require_s3_client()
        bucket = get_settings().resolve_s3_bucket()
        return _load_library_index_json(client, bucket)

    return await asyncio.to_thread(_load)


@router.get("/hero-carousel", response_model=HeroCarouselResponse)
async def get_hero_carousel() -> HeroCarouselResponse:
    """Отдаёт обложки hiro_carousel с лендинга; авторизация не требуется."""

    def _load() -> HeroCarouselResponse:
        client = _require_s3_client()
        bucket = get_settings().resolve_s3_bucket()
        raw_bytes = _read_hiro_carousel_index_bytes(client, bucket)
        if not raw_bytes:
            return _build_hero_carousel_from_covers(client, bucket)
        try:
            parsed = json.loads(raw_bytes.decode("utf-8")) if raw_bytes else {}
        except (UnicodeDecodeError, json.JSONDecodeError) as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Некорректный JSON в {HIRO_CAROUSEL_INDEX_KEY}: {e}",
            ) from e
        if not isinstance(parsed, dict):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="index.json герой-карусели должен быть JSON-объектом.",
            )
        return _build_hero_carousel_from_index(client, bucket, parsed)

    return await asyncio.to_thread(_load)


@router.post("/generate-from-template", response_model=GenerateFromTemplateResponse)
async def generate_from_template(
    body: GenerateFromTemplateRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    background_tasks: BackgroundTasks,
) -> GenerateFromTemplateResponse:
    """Создаёт async-задачу генерации и запускает её фоновую обработку."""
    profile_prefix = user_photo_prefix(user.id)
    if not body.user_photo_object_key.startswith(profile_prefix):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="user_photo_object_key должен указывать на фото из папки user_photo текущего пользователя.",
        )

    cost = _token_cost_for_quality(body.quality)
    if await get_balance(db, user.id) < cost:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Недостаточно токенов для этой генерации.",
        )

    row = GenerationRequest(
        user_id=user.id,
        generation_type=body.generation_type,
        quality=body.quality,
        aspect_ratio=body.aspect_ratio,
        model=_resolve_effective_model_for_quality(body.quality),
        template_id=body.template_id,
        manifest_path=body.manifest_path,
        selected_prompt=body.selected_prompt,
        user_photo_object_key=body.user_photo_object_key,
        template_photo_object_key=body.template_photo_object_key,
        status="queued",
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    background_tasks.add_task(_process_generation_request, row.id)

    return GenerateFromTemplateResponse(
        request_id=str(row.id),
        generation_type=row.generation_type,
        status=row.status,
    )


@router.get("/generate-from-template/{request_id}", response_model=GenerationStatusResponse)
async def get_generate_from_template_status(
    request_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> GenerationStatusResponse:
    """Возвращает статус async-задачи генерации и ссылку на результат при готовности."""
    try:
        generation_id = uuid.UUID(request_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Некорректный request_id.") from exc

    row = await db.get(GenerationRequest, generation_id)
    if row is None or row.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Задача генерации не найдена.")

    result_view_url: str | None = None
    if row.status == "done" and row.result_object_key:
        client = _require_s3_client()
        bucket = get_settings().resolve_s3_bucket()
        result_view_url = await asyncio.to_thread(_presign_get_url, client, bucket, row.result_object_key)

    return GenerationStatusResponse(
        request_id=str(row.id),
        generation_type=row.generation_type,
        status=row.status,
        result_object_key=row.result_object_key,
        result_view_url=result_view_url,
        error=row.error_message,
    )


@router.get("/my-photos", response_model=MyPhotosResponse)
async def list_my_photos(
    user: Annotated[User, Depends(get_current_user)],
) -> MyPhotosResponse:
    """Возвращает изображения из S3 …/result_generation/ (результаты генераций) с ссылками на просмотр."""

    def _load() -> MyPhotosResponse:
        client = _require_s3_client()
        bucket = get_settings().resolve_s3_bucket()
        items = list_user_folder_images(client, bucket, user.id, "result_generation")
        return MyPhotosResponse(items=items)

    try:
        return await asyncio.to_thread(_load)
    except ClientError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Ошибка S3 при чтении «мои фото»: {e}",
        ) from e


@router.get("/my-photos/download")
async def download_my_photo(
    object_key: Annotated[str, Query(min_length=8, max_length=512)],
    user: Annotated[User, Depends(get_current_user)],
) -> Response:
    """Скачивает фото из S3 result_generation как вложение через backend."""
    expected_prefix = user_result_generation_prefix(user.id)
    normalized_key = object_key.strip().lstrip("/")
    if not normalized_key.startswith(expected_prefix):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Можно скачивать только фото из вашей папки result_generation.",
        )

    def _load() -> tuple[bytes, str]:
        client = _require_s3_client()
        bucket = get_settings().resolve_s3_bucket()
        obj = client.get_object(Bucket=bucket, Key=normalized_key)
        body = obj.get("Body")
        file_bytes = body.read() if body is not None else b""
        content_type = str(obj.get("ContentType") or "application/octet-stream")
        return file_bytes, content_type

    try:
        file_bytes, content_type = await asyncio.to_thread(_load)
    except ClientError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Ошибка S3 при скачивании фото: {e}",
        ) from e

    filename = _safe_filename(normalized_key.split("/")[-1] or "photo.jpg")
    return Response(
        content=file_bytes,
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.delete("/my-photos", response_model=DeleteMyPhotoResponse)
async def delete_my_photo(
    body: DeleteMyPhotoRequest,
    user: Annotated[User, Depends(get_current_user)],
) -> DeleteMyPhotoResponse:
    """Удаляет фото из S3 папки result_generation текущего пользователя."""
    expected_prefix = user_result_generation_prefix(user.id)
    object_key = body.object_key.strip().lstrip("/")
    if not object_key.startswith(expected_prefix):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Можно удалять только фото из вашей папки result_generation.",
        )

    def _delete() -> None:
        client = _require_s3_client()
        bucket = get_settings().resolve_s3_bucket()
        client.delete_object(Bucket=bucket, Key=object_key)

    try:
        await asyncio.to_thread(_delete)
    except ClientError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Ошибка S3 при удалении фото: {e}",
        ) from e
    return DeleteMyPhotoResponse(deleted=True, object_key=object_key)


@router.get("/profile-photos", response_model=MyPhotosResponse)
async def list_profile_photos(
    user: Annotated[User, Depends(get_current_user)],
) -> MyPhotosResponse:
    """Возвращает изображения из S3 …/user_photo/ для экрана «Профиль» (загрузки пользователя)."""

    def _load() -> MyPhotosResponse:
        client = _require_s3_client()
        bucket = get_settings().resolve_s3_bucket()
        items = list_user_folder_images(client, bucket, user.id, "user_photo")
        return MyPhotosResponse(items=items)

    try:
        return await asyncio.to_thread(_load)
    except ClientError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Ошибка S3 при чтении фото профиля: {e}",
        ) from e
