# Фабрика клиента boto3 для S3 по переменным из .env.
from typing import Any

import boto3
from botocore.config import Config

from app.core.config import get_settings


def make_s3_client() -> Any | None:
    """Собирает клиент boto3 для S3 или возвращает None, если в .env не хватает бакета или ключей."""
    s = get_settings()
    bucket = s.resolve_s3_bucket()
    access = s.resolve_s3_access_key()
    secret = s.resolve_s3_secret()
    if not bucket or not access or not secret:
        return None
    return boto3.client(
        "s3",
        endpoint_url=s.resolve_s3_endpoint(),
        aws_access_key_id=access,
        aws_secret_access_key=secret,
        region_name=s.resolve_s3_region(),
        config=Config(signature_version="s3v4"),
    )
