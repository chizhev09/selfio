# Префиксы ключей S3 для каждого пользователя: тот же корень S3_selfio, что и у библиотеки.
import uuid

# Общий префикс продукта в бакете (папка library/ уже лежит здесь же).
SELFIO_S3_PREFIX = "S3_selfio"
# Пользователи: S3_selfio/users/<uuid>/user_photo/ и …/result_generation/.
SELFIO_USERS_ROOT = f"{SELFIO_S3_PREFIX}/users"
USER_PHOTO_FOLDER = "user_photo"
RESULT_GENERATION_FOLDER = "result_generation"


def user_home_prefix(user_id: uuid.UUID) -> str:
    """Возвращает префикс корневой «папки» пользователя в бакете, с завершающим слэшем."""
    return f"{SELFIO_USERS_ROOT}/{user_id}/"


def user_photo_prefix(user_id: uuid.UUID) -> str:
    """Возвращает префикс папки с загружаемыми пользователем фото (галерея / референсы)."""
    return f"{user_home_prefix(user_id)}{USER_PHOTO_FOLDER}/"


def user_result_generation_prefix(user_id: uuid.UUID) -> str:
    """Возвращает префикс папки с результатами генераций для этого пользователя."""
    return f"{user_home_prefix(user_id)}{RESULT_GENERATION_FOLDER}/"


def user_photo_layout_marker_key(user_id: uuid.UUID) -> str:
    """Возвращает ключ маркера, чтобы в консоли S3 была видна папка user_photo (файл .keep)."""
    return f"{user_photo_prefix(user_id)}.keep"


def user_result_generation_layout_marker_key(user_id: uuid.UUID) -> str:
    """Возвращает ключ маркера для папки result_generation."""
    return f"{user_result_generation_prefix(user_id)}.keep"
