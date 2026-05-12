# Листинг изображений пользователя в бакете: user_photo (вкладка «Профиль») и result_generation («Мои фото»).
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Literal

from botocore.exceptions import ClientError

from app.core.config import get_settings
from app.S3_storage.paths import user_photo_prefix, user_result_generation_prefix
from app.S3_storage.schemas import UserPhotoItem

# Какие папки в S3 отдаём в какой раздел приложения.
UserFolderKind = Literal["user_photo", "result_generation"]

# Расширения, по которым считаем объект картинкой для сетки (как у витрины библиотеки).
_IMAGE_SUFFIXES = (
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".heic",
    ".heif",
)


def _folder_prefix(user_id: uuid.UUID, folder: UserFolderKind) -> str:
    """Возвращает префикс ключей S3 для выбранной «папки» пользователя."""
    if folder == "user_photo":
        return user_photo_prefix(user_id)
    return user_result_generation_prefix(user_id)


def _is_listable_image_key(object_key: str) -> bool:
    """Отфильтровывает маркер .keep и файлы без графического расширения."""
    base = object_key.rstrip("/").split("/")[-1].lower()
    if base == ".keep":
        return False
    lower = object_key.lower()
    return any(lower.endswith(s) for s in _IMAGE_SUFFIXES)


def _view_url_for_object(client: Any, bucket: str, object_key: str) -> str:
    """Строит публичный URL или presigned GET на объект (логика как у библиотеки в router)."""
    settings = get_settings()
    base = settings.s3_public_base_url.strip().rstrip("/")
    if base:
        return f"{base}/{object_key}"
    try:
        return client.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket, "Key": object_key},
            ExpiresIn=604800,
            HttpMethod="GET",
        )
    except ClientError:
        raise


def _original_filename_from_key(object_key: str) -> str | None:
    """Достаёт имя файла из полного ключа для подписи в UI."""
    seg = object_key.rstrip("/").split("/")[-1].strip()
    return seg if seg else None


def _created_at_iso(last_modified: datetime | None) -> str:
    """Превращает LastModified из S3 в строку для поля created_at в ответе API."""
    if last_modified is None:
        return datetime.now(timezone.utc).isoformat()
    if last_modified.tzinfo is None:
        last_modified = last_modified.replace(tzinfo=timezone.utc)
    return last_modified.isoformat()


def _sort_ts(last_modified: datetime | None) -> float:
    """Число для сортировки: новые файлы выше."""
    if last_modified is None:
        return 0.0
    if last_modified.tzinfo is None:
        last_modified = last_modified.replace(tzinfo=timezone.utc)
    return last_modified.timestamp()


def list_user_folder_images(
    client: Any,
    bucket: str,
    user_id: uuid.UUID,
    folder: UserFolderKind,
    *,
    max_items: int = 200,
) -> list[UserPhotoItem]:
    """Синхронно листает S3 под префиксом папки и возвращает элементы с view_url (вызывать из to_thread)."""
    prefix = _folder_prefix(user_id, folder)
    collected: list[tuple[str, datetime | None]] = []
    token: str | None = None

    while len(collected) < max_items:
        kwargs: dict[str, Any] = {"Bucket": bucket, "Prefix": prefix, "MaxKeys": 500}
        if token:
            kwargs["ContinuationToken"] = token
        try:
            page = client.list_objects_v2(**kwargs)
        except ClientError:
            raise

        for obj in page.get("Contents") or []:
            key = obj.get("Key") or ""
            if not key or key.endswith("/"):
                continue
            if not _is_listable_image_key(key):
                continue
            lm = obj.get("LastModified")
            dt = lm if isinstance(lm, datetime) else None
            collected.append((key, dt))
            if len(collected) >= max_items:
                break

        if len(collected) >= max_items:
            break
        if not page.get("IsTruncated"):
            break
        token = page.get("NextContinuationToken")
        if not token:
            break

    collected.sort(key=lambda t: _sort_ts(t[1]), reverse=True)

    items: list[UserPhotoItem] = []
    for key, lm in collected[:max_items]:
        items.append(
            UserPhotoItem(
                id=key,
                object_key=key,
                view_url=_view_url_for_object(client, bucket, key),
                original_filename=_original_filename_from_key(key),
                created_at=_created_at_iso(lm),
            )
        )
    return items
