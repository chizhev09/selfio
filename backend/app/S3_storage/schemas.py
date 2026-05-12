# Pydantic-схемы запросов и ответов для эндпоинтов хранилища S3.
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class PresignUploadRequest(BaseModel):
    """Имя файла и MIME-тип для подписанного PUT в S3."""

    filename: str = Field(..., min_length=1, max_length=200)
    content_type: str = Field(default="image/jpeg", max_length=120)

    @field_validator("content_type")
    @classmethod
    def must_be_image(cls, v: str) -> str:
        """Ограничиваем типы для тестового сценария (фото профиля)."""
        v = v.strip().lower()
        if not v.startswith("image/"):
            raise ValueError("Разрешены только изображения (image/*).")
        return v


class PresignUploadResponse(BaseModel):
    """URL и заголовки для прямой загрузки браузером в бакет."""

    method: str = "PUT"
    upload_url: str
    headers: dict[str, str]
    object_key: str
    public_url: str | None = None


class UploadCompleteRequest(BaseModel):
    """Подтверждение успешной загрузки: сохраняем запись для галереи."""

    object_key: str = Field(..., min_length=8, max_length=512)
    content_type: str = Field(..., max_length=120)
    original_filename: str | None = Field(default=None, max_length=255)

    @field_validator("content_type")
    @classmethod
    def must_be_image(cls, v: str) -> str:
        """Только изображения, как при presign."""
        v = v.strip().lower()
        if not v.startswith("image/"):
            raise ValueError("Разрешены только изображения (image/*).")
        return v


class UserPhotoItem(BaseModel):
    """Элемент списка «мои фото» с временной ссылкой на просмотр."""

    id: str
    object_key: str
    view_url: str
    original_filename: str | None
    created_at: str


class MyPhotosResponse(BaseModel):
    """Список фото пользователя."""

    items: list[UserPhotoItem]


class DeleteMyPhotoRequest(BaseModel):
    """Запрос на удаление фото из папки result_generation текущего пользователя."""

    object_key: str = Field(..., min_length=8, max_length=512)


class DeleteMyPhotoResponse(BaseModel):
    """Подтверждает успешное удаление фото из S3."""

    deleted: bool = True
    object_key: str


class LibraryPhotoItem(BaseModel):
    """Кадр витрины библиотеки: ключ в S3 и URL для <img>."""

    id: str
    object_key: str
    view_url: str
    caption: str | None = None


class LibraryCategoryItem(BaseModel):
    """Категория библиотеки и список снимков из папки в бакете."""

    id: str
    title: str
    hint: str
    prefix: str
    items: list[LibraryPhotoItem]


class LibraryCatalogResponse(BaseModel):
    """Все категории витрины (папки selfio/library/... в S3)."""

    categories: list[LibraryCategoryItem]


class LibraryIndexCategoryItem(BaseModel):
    """Категория из index.json для быстрой ленты под поиском."""

    id: str
    name: str


class LibraryIndexCategoriesResponse(BaseModel):
    """Список категорий, прочитанных из S3_selfio/library/index.json."""

    categories: list[LibraryIndexCategoryItem]


class HeroCarouselCollectionItem(BaseModel):
    """Одна коллекция витрины героя: обложка в S3 и id фото из манифеста."""

    id: str
    cover_object_key: str
    cover_url: str
    photoIds: list[str] = Field(default_factory=list)


class HeroCarouselResponse(BaseModel):
    """Манифест hiro_carousel/index.json плюс готовые URL для <img> на лендинге."""

    version: int
    collections: list[HeroCarouselCollectionItem]


class GenerateFromTemplateRequest(BaseModel):
    """Запрос на генерацию по шаблону с выбранным промтом и ключами входных изображений."""

    generation_type: str = Field(..., pattern="^(one_to_one|similar)$")
    quality: str = Field(default="standard", min_length=1, max_length=32)
    aspect_ratio: str = Field(default="9:16", min_length=1, max_length=16)
    model: Literal[
        "google/gemini-3-pro-image-preview",
        "google/gemini-2.5-flash-image",
        "flux 2 pro",
        "flux 2 max",
        "black-forest-labs/flux.2-pro",
        "black-forest-labs/flux.2-max",
    ] = "google/gemini-3-pro-image-preview"
    template_id: str = Field(..., min_length=1, max_length=120)
    manifest_path: str = Field(..., min_length=1, max_length=512)
    selected_prompt: str = Field(..., min_length=1)
    user_photo_object_key: str = Field(..., min_length=8, max_length=512)
    template_photo_object_key: str | None = Field(default=None, max_length=512)

    @field_validator("template_id", mode="before")
    @classmethod
    def coerce_template_id_to_string(cls, v: object) -> str:
        """Приводит template_id к строке, чтобы принимать как строковые, так и числовые id."""
        if isinstance(v, str):
            value = v.strip()
            if not value:
                raise ValueError("template_id не должен быть пустым.")
            return value
        if isinstance(v, (int, float)):
            return str(v)
        raise ValueError("template_id должен быть строкой или числом.")


class GenerateFromTemplateResponse(BaseModel):
    """Результат создания async-задачи генерации."""

    request_id: str
    generation_type: str
    status: Literal["queued", "processing", "done", "failed"]


class GenerationStatusResponse(BaseModel):
    """Текущее состояние задачи генерации и данные результата."""

    request_id: str
    generation_type: str
    status: Literal["queued", "processing", "done", "failed"]
    result_object_key: str | None = None
    result_view_url: str | None = None
    error: str | None = None
