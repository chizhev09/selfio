# Создание в бакете S3 структуры папок пользователя (маркеры .keep внутри user_photo и result_generation).
import logging
import uuid

from botocore.exceptions import ClientError

from app.core.config import get_settings
from app.S3_storage.client import make_s3_client
from app.S3_storage.paths import user_photo_layout_marker_key, user_result_generation_layout_marker_key

logger = logging.getLogger(__name__)

# Непустое тело: часть S3-совместимых хранилищ плохо принимает объект с нулевой длиной.
_MARKER_BODY = b"#"


def ensure_user_s3_folders(user_id: uuid.UUID) -> None:
    """Создаёт маркеры .keep в user_photo/ и result_generation/; при отсутствии S3 пишет предупреждение в лог."""
    client = make_s3_client()
    if client is None:
        logger.warning(
            "S3 не настроен — папки для пользователя %s не созданы. "
            "Задайте в backend/.env: BUCKET_NAME (или S3_BUCKET), S3_ACCESS_KEY, S3_SECRET_ACCESS_KEY, "
            "при необходимости S3_ENDPOINT_URL и S3_REGION.",
            user_id,
        )
        return
    bucket = get_settings().resolve_s3_bucket()
    if not bucket:
        logger.warning(
            "Имя бакета пустое — папки для %s не созданы. Проверьте BUCKET_NAME / S3_BUCKET в .env.",
            user_id,
        )
        return

    for key in (user_photo_layout_marker_key(user_id), user_result_generation_layout_marker_key(user_id)):
        try:
            client.put_object(Bucket=bucket, Key=key, Body=_MARKER_BODY)
            logger.info("S3: записан маркер %s", key)
        except ClientError as e:
            logger.exception("Не удалось записать маркер S3 %s: %s", key, e)
