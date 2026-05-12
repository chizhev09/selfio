# Асинхронный engine и сессии SQLAlchemy (psycopg async) для FastAPI; пул рассчитан на тысячи одновременных запросов.
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings

settings = get_settings()
engine = create_async_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_size=25,
    max_overflow=75,
    pool_timeout=30,
)
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Отдаёт асинхронную сессию БД для FastAPI Depends; закрывает после запроса."""
    async with AsyncSessionLocal() as session:
        yield session


from app.S3_storage.listeners import register_user_s3_listeners

register_user_s3_listeners()
